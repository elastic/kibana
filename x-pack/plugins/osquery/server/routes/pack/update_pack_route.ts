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
  uniq,
  some,
  isEmpty,
} from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';

import { satisfies } from 'semver';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { convertSOQueriesToPack, convertPackQueriesToSO } from './utils';
import { getInternalSavedObjectsClient } from '../utils';
import type { PackSavedObjectAttributes } from '../../common/types';

export const updatePackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.put(
    {
      path: '/api/osquery/packs/{id}',
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
            shards: schema.maybe(schema.recordOf(schema.string(), schema.number())),
            queries: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  query: schema.string(),
                  interval: schema.maybe(schema.number()),
                  snapshot: schema.maybe(schema.boolean()),
                  removed: schema.maybe(schema.boolean()),
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
      const { name, description, queries, enabled, policy_ids, shards } = request.body;

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
          some(
            filter(conflictingEntries.saved_objects, (packSO) => packSO.id !== currentPackSO.id),
            ['attributes.name', name]
          )
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

      const getPolicies = async () => {
        if (policy_ids?.length) {
          return policy_ids;
        }

        const supportedPackagePolicyIds = filter(packagePolicies, (packagePolicy) =>
          satisfies(packagePolicy.package?.version ?? '', '>=0.6.0')
        );

        return uniq(map(supportedPackagePolicyIds, 'policy_id'));
      };

      let policiesList = await getPolicies();

      const agentPolicies = await agentPolicyService?.getByIds(
        internalSavedObjectsClient,
        policiesList
      );

      // Find the agentPolicies that has name containing shard name
      const filteredList: AgentPolicy[] = [];
      if (!isEmpty(shards)) {
        const agentPoliciesNames = map(agentPolicies, 'name');
        const agentPoliciesNameMap = mapKeys(agentPolicies, 'name');

        map(shards, (shard, shardName) => {
          map(agentPoliciesNames, (agentPolicyName) => {
            if (agentPolicyName.includes(shardName)) {
              filteredList.push(agentPoliciesNameMap[agentPolicyName]);
            }
          });
        });
      }

      // We update policiesList only if we find any valid shards, otherwise it has all policies - which makes it global
      // TODO add functionality to add shard to a global pack
      if (filteredList.length) {
        policiesList = map(filteredList, 'id');
      }

      const agentPoliciesIdMap = mapKeys(agentPolicies, 'id');

      const nonAgentPolicyReferences = filter(
        currentPackSO.references,
        (reference) => reference.type !== AGENT_POLICY_SAVED_OBJECT_TYPE
      );
      const getUpdatedReferences = () => {
        if (!policy_ids && isEmpty(shards)) {
          return currentPackSO.references;
        }

        return [
          ...nonAgentPolicyReferences,
          ...policiesList.map((id) => ({
            id,
            name: agentPoliciesIdMap[id]?.name,
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          })),
        ];
      };

      const references = getUpdatedReferences();
      // TODO find out where to put the shard

      await savedObjectsClient.update<PackSavedObjectAttributes>(
        packSavedObjectType,
        request.params.id,
        {
          enabled,
          name,
          description: description || '',
          queries: queries && convertPackQueriesToSO(queries),
          updated_at: moment().toISOString(),
          updated_by: currentUser,
          shards: shards || {},
        },
        {
          refresh: 'wait_for',
          references,
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
          const policyIds = policy_ids || shards ? policiesList : currentAgentPolicyIds;

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
        const agentPolicyIdsToRemove = uniq(difference(currentAgentPolicyIds, policiesList));
        const agentPolicyIdsToUpdate = uniq(
          difference(currentAgentPolicyIds, agentPolicyIdsToRemove)
        );
        const agentPolicyIdsToAdd = uniq(difference(policiesList, currentAgentPolicyIds));

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
                      queries: convertSOQueriesToPack(updatedPackSO.attributes.queries, {
                        removeMultiLines: true,
                        removeResultType: true,
                      }),
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
                      queries: convertSOQueriesToPack(updatedPackSO.attributes.queries, {
                        removeResultType: true,
                      }),
                    }
                  );

                  return draft;
                })
              );
            }
          })
        );
      }

      return response.ok({ body: { data: updatedPackSO } });
    }
  );
};
