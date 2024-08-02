/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { satisfies } from 'semver';
import { set } from '@kbn/safer-lodash-set';
import { filter, reduce, mapKeys, each, unset, uniq, map, has, flatMap } from 'lodash';
import type { PackagePolicyInputStream } from '@kbn/fleet-plugin/common';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertPackQueriesToSO } from '../pack/utils';
import { getInternalSavedObjectsClient } from '../utils';

export const createStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/status',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
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
                if (policy.policy_ids.every((policyId) => acc.agentPolicyToPackage[policyId])) {
                  acc.packagePoliciesToDelete.push(policy.id);
                } else {
                  for (const policyId of policy.policy_ids) {
                    acc.agentPolicyToPackage[policyId] = policy.id;
                  }
                }

                const packagePolicyName = policy.name;
                const currentOsqueryManagerNamePacksCount = filter(
                  Object.keys(acc.packs),
                  (packName) => packName.startsWith(OSQUERY_INTEGRATION_NAME)
                ).length;

                const packName = packagePolicyName.startsWith(OSQUERY_INTEGRATION_NAME)
                  ? `osquery_manager-1_${currentOsqueryManagerNamePacksCount + 1}`
                  : packagePolicyName;

                if (has(policy, 'inputs[0].streams[0]')) {
                  if (!acc.packs[packName]) {
                    acc.packs[packName] = {
                      policy_ids: policy.policy_ids,
                      enabled: !packName.startsWith(OSQUERY_INTEGRATION_NAME),
                      name: packName,
                      description: policy.description,
                      queries: reduce<PackagePolicyInputStream, Record<string, unknown>>(
                        policy.inputs[0].streams,
                        (queries, stream) => {
                          if (stream.compiled_stream?.id) {
                            const { id: queryId, ...query } = stream.compiled_stream;
                            queries[queryId] = query;
                          }

                          return queries;
                        },
                        {}
                      ),
                    };
                  } else {
                    acc.packs[packName].policy_ids.push(...policy.policy_ids);
                  }
                }

                return acc;
              },
              {
                packs: {} as Record<
                  string,
                  {
                    policy_ids: string[];
                    enabled: boolean;
                    name: string;
                    description?: string;
                    queries: Record<string, unknown>;
                  }
                >,
                agentPolicyToPackage: {} as Record<string, string>,
                packagePoliciesToDelete: [] as string[],
              }
            );

            await packageService?.ensureInstalledPackage({
              pkgName: OSQUERY_INTEGRATION_NAME,
            });

            const agentPolicyIds = uniq(flatMap(policyPackages?.items, 'policy_ids'));
            const agentPolicies = mapKeys(
              await agentPolicyService?.getByIds(internalSavedObjectsClient, agentPolicyIds),
              'id'
            );

            await Promise.all(
              map(migrationObject.packs, async (packObject) => {
                await internalSavedObjectsClient.create(
                  packSavedObjectType,
                  {
                    name: packObject.name,
                    description: packObject.description,
                    queries: convertPackQueriesToSO(packObject.queries),
                    enabled: packObject.enabled,
                    created_at: new Date().toISOString(),
                    created_by: 'system',
                    updated_at: new Date().toISOString(),
                    updated_by: 'system',
                  },
                  {
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
                        policy_template: OSQUERY_INTEGRATION_NAME,
                        streams: [],
                        type: 'osquery',
                      });

                      each(agentPacks, (agentPack) => {
                        set(draft, `inputs[0].config.osquery.value.packs.${agentPack.name}`, {
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
