/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { set, unset, has, difference, filter, find, map, mapKeys, uniq } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { IRouter } from '@kbn/core/server';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { convertSOQueriesToPack, convertPackQueriesToSO } from './utils';
import { getInternalSavedObjectsClient } from '../../usage/collector';
import { PackSavedObjectAttributes } from '../../common/types';

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
            name: schema.maybe(schema.string()),
            description: schema.maybe(schema.string()),
            enabled: schema.maybe(schema.boolean()),
            policy_ids: schema.maybe(schema.arrayOf(schema.string())),
            queries: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  query: schema.string(),
                  interval: schema.maybe(schema.number()),
                  platform: schema.maybe(schema.string()),
                  version: schema.maybe(schema.string()),
                  ecs_mapping: schema.maybe(
                    schema.recordOf(
                      schema.string(),
                      schema.object({
                        field: schema.maybe(schema.string()),
                        value: schema.maybe(
                          schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
                        ),
                      })
                    )
                  ),
                })
              )
            ),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = coreContext.savedObjects.client;
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { name, description, queries, enabled, policy_ids } = request.body;

      const currentPackSO = await savedObjectsClient.get<{ name: string; enabled: boolean }>(
        packSavedObjectType,
        request.params.id
      );

      if (name) {
        const conflictingEntries = await savedObjectsClient.find<PackSavedObjectAttributes>({
          type: packSavedObjectType,
          filter: `${packSavedObjectType}.attributes.name: "${name}"`,
        });

        if (
          filter(
            conflictingEntries.saved_objects,
            (packSO) =>
              packSO.id !== currentPackSO.id && packSO.attributes.name.length === name.length
          ).length
        ) {
          return response.conflict({ body: `Pack with name "${name}" already exists.` });
        }
      }

      const { items: packagePolicies } = (await packagePolicyService?.list(
        internalSavedObjectsClient,
        {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
          page: 1,
        }
      )) ?? { items: [] };
      const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
        has(packagePolicy, `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`)
      );
      const agentPolicies = policy_ids
        ? mapKeys(await agentPolicyService?.getByIds(internalSavedObjectsClient, policy_ids), 'id')
        : {};
      const agentPolicyIds = Object.keys(agentPolicies);

      const nonAgentPolicyReferences = filter(
        currentPackSO.references,
        (reference) => reference.type !== AGENT_POLICY_SAVED_OBJECT_TYPE
      );

      const getUpdatedReferences = () => {
        if (policy_ids) {
          return [
            ...nonAgentPolicyReferences,
            ...policy_ids.map((id) => ({
              id,
              name: agentPolicies[id].name,
              type: AGENT_POLICY_SAVED_OBJECT_TYPE,
            })),
          ];
        }

        return currentPackSO.references;
      };

      await savedObjectsClient.update(
        packSavedObjectType,
        request.params.id,
        {
          enabled,
          name,
          description: description || '',
          queries: queries && convertPackQueriesToSO(queries),
          updated_at: moment().toISOString(),
          updated_by: currentUser,
        },
        {
          refresh: 'wait_for',
          references: getUpdatedReferences(),
        }
      );

      const currentAgentPolicyIds = map(
        filter(currentPackSO.references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]),
        'id'
      );

      const updatedPackSO = await savedObjectsClient.get<{
        name: string;
        enabled: boolean;
        queries: Record<string, unknown>;
      }>(packSavedObjectType, request.params.id);

      updatedPackSO.attributes.queries = convertSOQueriesToPack(updatedPackSO.attributes.queries);

      if (enabled == null && !currentPackSO.attributes.enabled) {
        return response.ok({ body: updatedPackSO });
      }

      if (enabled != null && enabled !== currentPackSO.attributes.enabled) {
        if (enabled) {
          const policyIds = policy_ids ? agentPolicyIds : currentAgentPolicyIds;

          await Promise.all(
            policyIds.map((agentPolicyId) => {
              const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);

              if (packagePolicy) {
                return packagePolicyService?.update(
                  internalSavedObjectsClient,
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
                        queries: updatedPackSO.attributes.queries,
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
                internalSavedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(draft, 'id');
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

        await Promise.all(
          agentPolicyIdsToRemove.map((agentPolicyId) => {
            const packagePolicy = find(currentPackagePolicies, ['policy_id', agentPolicyId]);
            if (packagePolicy) {
              return packagePolicyService?.update(
                internalSavedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(draft, 'id');
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
                internalSavedObjectsClient,
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
                      queries: updatedPackSO.attributes.queries,
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
                internalSavedObjectsClient,
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
                      queries: updatedPackSO.attributes.queries,
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
