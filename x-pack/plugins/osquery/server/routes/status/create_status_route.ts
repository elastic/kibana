/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { satisfies } from 'semver';
import { filter, reduce, mapKeys, each, set, unset, uniq, map, has } from 'lodash';
import { packSavedObjectType } from '../../../common/types';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../fleet/common';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertPackQueriesToSO } from '../pack/utils';
import { getInternalSavedObjectsClient } from '../../usage/collector';

export const createStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/status',
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const packageService = osqueryContext.service.getPackageService()?.asInternalUser;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();

      const packageInfo = await packageService?.getInstallation(OSQUERY_INTEGRATION_NAME);

      if (packageInfo?.install_version && satisfies(packageInfo?.install_version, '<0.6.0')) {
        try {
          const policyPackages = await packagePolicyService?.list(internalSavedObjectsClient, {
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
            perPage: 10000,
            page: 1,
          });

          const migrationObject = reduce(
            policyPackages?.items,
            (acc, policy) => {
              if (acc.agentPolicyToPackage[policy.policy_id]) {
                acc.packagePoliciesToDelete.push(policy.id);
              } else {
                acc.agentPolicyToPackage[policy.policy_id] = policy.id;
              }

              const packagePolicyName = policy.name;
              const currentOsqueryManagerNamePacksCount = filter(
                Object.keys(acc.packs),
                (packName) => packName.startsWith('osquery_manager')
              ).length;

              const packName = packagePolicyName.startsWith('osquery_manager')
                ? `osquery_manager-1_${currentOsqueryManagerNamePacksCount + 1}`
                : packagePolicyName;

              if (has(policy, 'inputs[0].streams[0]')) {
                if (!acc.packs[packName]) {
                  acc.packs[packName] = {
                    policy_ids: [policy.policy_id],
                    enabled: !packName.startsWith('osquery_manager'),
                    name: packName,
                    description: policy.description,
                    queries: reduce(
                      policy.inputs[0].streams,
                      (queries, stream) => {
                        if (stream.compiled_stream?.id) {
                          const { id: queryId, ...query } = stream.compiled_stream;
                          queries[queryId] = query;
                        }
                        return queries;
                      },
                      {} as Record<string, unknown>
                    ),
                  };
                } else {
                  // @ts-expect-error update types
                  acc.packs[packName].policy_ids.push(policy.policy_id);
                }
              }

              return acc;
            },
            {
              packs: {} as Record<string, unknown>,
              agentPolicyToPackage: {} as Record<string, string>,
              packagePoliciesToDelete: [] as string[],
            }
          );

          await packageService?.ensureInstalledPackage({
            pkgName: OSQUERY_INTEGRATION_NAME,
          });

          const agentPolicyIds = uniq(map(policyPackages?.items, 'policy_id'));
          const agentPolicies = mapKeys(
            await agentPolicyService?.getByIds(internalSavedObjectsClient, agentPolicyIds),
            'id'
          );

          await Promise.all(
            map(migrationObject.packs, async (packObject) => {
              await internalSavedObjectsClient.create(
                packSavedObjectType,
                {
                  // @ts-expect-error update types
                  name: packObject.name,
                  // @ts-expect-error update types
                  description: packObject.description,
                  // @ts-expect-error update types
                  queries: convertPackQueriesToSO(packObject.queries),
                  // @ts-expect-error update types
                  enabled: packObject.enabled,
                  created_at: new Date().toISOString(),
                  created_by: 'system',
                  updated_at: new Date().toISOString(),
                  updated_by: 'system',
                },
                {
                  // @ts-expect-error update types
                  references: packObject.policy_ids.map((policyId: string) => ({
                    id: policyId,
                    name: agentPolicies[policyId].name,
                    type: AGENT_POLICY_SAVED_OBJECT_TYPE,
                  })),
                  refresh: 'wait_for',
                }
              );
            })
          );

          // delete unnecessary package policies
          await packagePolicyService?.delete(
            internalSavedObjectsClient,
            esClient,
            migrationObject.packagePoliciesToDelete
          );

          // updatePackagePolicies
          await Promise.all(
            map(migrationObject.agentPolicyToPackage, async (value, key) => {
              const agentPacks = filter(migrationObject.packs, (pack) =>
                // @ts-expect-error update types
                pack.policy_ids.includes(key)
              );
              await packagePolicyService?.upgrade(internalSavedObjectsClient, esClient, [value]);
              const packagePolicy = await packagePolicyService?.get(
                internalSavedObjectsClient,
                value
              );

              if (packagePolicy) {
                return packagePolicyService?.update(
                  internalSavedObjectsClient,
                  esClient,
                  packagePolicy.id,
                  produce(packagePolicy, (draft) => {
                    unset(draft, 'id');

                    set(draft, 'name', 'osquery_manager-1');

                    set(draft, 'inputs[0]', {
                      enabled: true,
                      policy_template: 'osquery_manager',
                      streams: [],
                      type: 'osquery',
                    });

                    each(agentPacks, (agentPack) => {
                      // @ts-expect-error update types
                      set(draft, `inputs[0].config.osquery.value.packs.${agentPack.name}`, {
                        // @ts-expect-error update types
                        queries: agentPack.queries,
                      });
                    });

                    return draft;
                  })
                );
              }
            })
          );
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }

      return response.ok({ body: packageInfo });
    }
  );
};
