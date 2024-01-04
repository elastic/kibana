/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ListWithKuery } from '@kbn/fleet-plugin/server/types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { filter, map, mapKeys, uniq } from 'lodash';
import type { PackagePolicy } from '@kbn/fleet-plugin/server/types';
import { satisfies } from 'semver';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { processAggregations } from '../../../common/utils/aggregations';
import { getInternalSavedObjectsClient } from '../utils';
import { getAgentsRequestQuerySchema } from '../../../common/api';
import type { GetAgentsRequestQuerySchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS, OSQUERY_INTEGRATION_NAME } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agents',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof getAgentsRequestQuerySchema,
              GetAgentsRequestQuerySchema
            >(getAgentsRequestQuerySchema),
          },
        },
      },
      async (context, request, response) => {
        let esAgents;
        const query = request.query as ListWithKuery & {
          showInactive: boolean;
          searchAfter?: SortResults;
          pitId?: string;
          getStatusSummary?: boolean;
        };
        try {
          esAgents = await osqueryContext.service.getAgentService()?.asInternalUser.listAgents({
            page: query.page,
            perPage: query.perPage,
            sortField: query.sortField,
            sortOrder: query.sortOrder,
            showUpgradeable: query.showUpgradeable,
            getStatusSummary: query.getStatusSummary,
            pitId: query.pitId,
            searchAfter: query.searchAfter,
            kuery: query.kuery,
            showInactive: query.showInactive,
            aggregations: {
              platforms: {
                terms: {
                  field: 'local_metadata.os.platform',
                },
              },
              policies: {
                terms: {
                  field: 'policy_id',
                  size: 2000,
                },
              },
            },
          });
        } catch (error) {
          return response.badRequest({ body: error });
        }

        const internalSavedObjectsClient = await getInternalSavedObjectsClient(
          osqueryContext.getStartServices
        );
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();
        const agentPolicyService = osqueryContext.service.getAgentPolicyService();

        const { items: packagePolicies } = (await packagePolicyService?.list(
          internalSavedObjectsClient,
          {
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
            perPage: 1000,
            page: 1,
          }
        )) ?? { items: [] as PackagePolicy[] };
        const supportedPackagePolicyIds = filter(packagePolicies, (packagePolicy) =>
          satisfies(packagePolicy.package?.version ?? '', '>=0.6.0')
        );
        const agentPolicyIds = uniq(map(supportedPackagePolicyIds, 'policy_id'));

        const agentPolicies = await agentPolicyService?.getByIds(
          internalSavedObjectsClient,
          agentPolicyIds
        );

        const agentPolicyById = mapKeys(agentPolicies, 'id');

        const { platforms, overlap, policies } = processAggregations(esAgents?.aggregations);

        return response.ok({
          body: {
            total: esAgents?.total ?? 0,
            groups: {
              platforms,
              overlap,
              policies: policies.map((p) => {
                const name = agentPolicyById[p.id]?.name ?? p.name;

                return {
                  ...p,
                  name,
                };
              }),
            },
            agents: esAgents?.agents ?? [],
          },
        });
      }
    );
};
