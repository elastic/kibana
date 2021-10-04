/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import {
  set,
  unset,
  has,
  difference,
  filter,
  find,
  map,
  mapKeys,
  pickBy,
  uniq,
  reduce,
  pick,
} from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
} from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';

export const updatePackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.put(
    {
      path: '/internal/osquery/packs/{id}',
      validate: {
        params: schema.object(
          {
            id: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            name: schema.string(),
            description: schema.maybe(schema.string()),
            enabled: schema.maybe(schema.boolean()),
            policy_ids: schema.maybe(schema.arrayOf(schema.string())),
            queries: schema.recordOf(
              schema.string(),
              schema.object({
                query: schema.string(),
                interval: schema.maybe(schema.any()),
                platform: schema.maybe(schema.string()),
                version: schema.maybe(schema.string()),
                ecs_mapping: schema.maybe(schema.object({}, { unknowns: 'allow' })),
              })
            ),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { name, description, queries, enabled, policy_ids } = request.body;

      const currentPackSO = await savedObjectsClient.get<{ name: string; enabled: boolean }>(
        packSavedObjectType,
        request.params.id
      );
      const { items: packagePolicies } = (await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      })) ?? { items: [] };
      const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
        has(packagePolicy, `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`)
      );
      const agentPolicies = policy_ids
        ? mapKeys(await agentPolicyService?.getByIds(savedObjectsClient, policy_ids), 'id')
        : {};
      const agentPolicyIds = Object.keys(agentPolicies);

      const normalizedQueries =
        queries &&
        reduce(
          queries,
          (acc, value, key) => {
            const ecsMapping =
              value.ecs_mapping &&
              reduce(
                value.ecs_mapping,
                (acc, value, key) => {
                  acc.push({ value: key, ...value });
                  return acc;
                },
                []
              );
            acc.push({
              id: key,
              ...pick(value, ['query', 'interval', 'platform', 'version']),
              ...(ecsMapping?.length ? { ecs_mapping: ecsMapping } : {}),
            });
            return acc;
          },
          []
        );

      await savedObjectsClient.update(
        packSavedObjectType,
        request.params.id,
        {
          enabled,
          ...(normalizedQueries ? { queries: normalizedQueries } : {}),
          ...pickBy({
            name,
            description,
            updated_at: moment().toISOString(),
            updated_by: currentUser,
          }),
        },
        policy_ids || queries
          ? {
              refresh: 'wait_for',
              references: produce(currentPackSO.references, (draft) => {
                const nonAgentPolicyOrSavedQueryReferences = filter(
                  draft,
                  (reference) =>
                    ![AGENT_POLICY_SAVED_OBJECT_TYPE, savedQuerySavedObjectType].includes(
                      reference.type
                    )
                );
                const agentPolicyReferences = filter(
                  draft,
                  (reference) => AGENT_POLICY_SAVED_OBJECT_TYPE === reference.type
                );

                draft = [
                  ...nonAgentPolicyOrSavedQueryReferences,
                  ...(policy_ids
                    ? policy_ids.map((id) => ({
                        id,
                        name: agentPolicies[id].name,
                        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
                      }))
                    : agentPolicyReferences),
                ];

                return draft;
              }),
            }
          : {
              refresh: 'wait_for',
            }
      );

      const currentAgentPolicyIds = map(
        filter(currentPackSO.references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]),
        'id'
      );

      const updatedPackSO = await savedObjectsClient.get<{
        name: string;
        enabled: boolean;
        queries: Record<string, any>;
      }>(packSavedObjectType, request.params.id);

      const packagePolicyQueries = reduce(
        updatedPackSO.attributes.queries,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        (acc, { id: queryId, ecs_mapping, ...query }) => {
          acc[queryId] = {
            ...query,
            ecs_mapping: reduce(
              ecs_mapping,
              (acc2, { value, field }) => {
                acc2[value] = {
                  field,
                };
                return acc2;
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {} as Record<string, any>
            ),
          };
          return acc;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as Record<string, any>
      );

      if (enabled != null && enabled !== currentPackSO.attributes.enabled) {
        if (enabled) {
          const policyIds = policy_ids ? agentPolicyIds : currentAgentPolicyIds;

          await Promise.all(
            policyIds.map((agentPolicyId) => {
              const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);

              if (packagePolicy) {
                return packagePolicyService?.update(
                  savedObjectsClient,
                  esClient,
                  packagePolicy.id,
                  produce<PackagePolicy>(packagePolicy, (draft) => {
                    unset(draft, 'id');
                    if (!has(draft, 'inputs[0].streams')) {
                      set(draft, 'inputs[0].streams', []);
                    }
                    set(
                      draft,
                      `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`,
                      {
                        queries: packagePolicyQueries,
                      }
                    );
                    return draft;
                  })
                );
              }
            })
          );
        } else {
          await Promise.all(
            currentAgentPolicyIds.map((agentPolicyId) => {
              const packagePolicy = find(currentPackagePolicies, ['policy_id', agentPolicyId]);
              if (!packagePolicy) return;

              return packagePolicyService?.update(
                savedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(
                    draft,
                    `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                  );
                  return draft;
                })
              );
            })
          );
        }
      } else {
        const agentPolicyIdsToRemove = uniq(difference(currentAgentPolicyIds, agentPolicyIds));
        const agentPolicyIdsToUpdate = uniq(
          difference(currentAgentPolicyIds, agentPolicyIdsToRemove)
        );
        const agentPolicyIdsToAdd = uniq(difference(agentPolicyIds, currentAgentPolicyIds));

        // console.log('agentPolicyToRemove', agentPolicyIdsToRemove);
        // console.log('agentPolicyIdsToUpdate', agentPolicyIdsToUpdate);
        // console.log('agentPolicyToAdd', agentPolicyIdsToAdd);

        await Promise.all(
          agentPolicyIdsToRemove.map((agentPolicyId) => {
            const packagePolicy = find(currentPackagePolicies, ['policy_id', agentPolicyId]);
            if (packagePolicy) {
              return packagePolicyService?.update(
                savedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(
                    draft,
                    `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                  );
                  return draft;
                })
              );
            }
          })
        );

        await Promise.all(
          agentPolicyIdsToUpdate.map((agentPolicyId) => {
            const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);

            if (packagePolicy) {
              return packagePolicyService?.update(
                savedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(draft, 'id');
                  if (updatedPackSO.attributes.name !== currentPackSO.attributes.name) {
                    unset(
                      draft,
                      `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                    );
                  }

                  set(
                    draft,
                    `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`,
                    {
                      queries: packagePolicyQueries,
                    }
                  );
                  return draft;
                })
              );
            }
          })
        );

        await Promise.all(
          agentPolicyIdsToAdd.map((agentPolicyId) => {
            const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);

            if (packagePolicy) {
              return packagePolicyService?.update(
                savedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(draft, 'id');
                  if (!(draft.inputs.length && draft.inputs[0].streams.length)) {
                    set(draft, 'inputs[0].streams', []);
                  }
                  set(
                    draft,
                    `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`,
                    {
                      queries: packagePolicyQueries,
                    }
                  );
                  return draft;
                })
              );
            }
          })
        );
      }

      return response.ok({ body: updatedPackSO });
    }
  );
};
