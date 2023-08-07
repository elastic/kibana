/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { getComplianceDashboardSchema } from '../../../common/schemas/stats';
import { getSafePostureTypeRuntimeMapping } from '../../../common/runtime_mappings/get_safe_posture_type_runtime_mapping';
import type {
  PosturePolicyTemplate,
  ComplianceDashboardData,
  GetComplianceDashboardRequest,
} from '../../../common/types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS, STATS_ROUTE_PATH } from '../../../common/constants';
import { getGroupedFindingsEvaluation } from './get_grouped_findings_evaluation';
import { ClusterWithoutTrend, getClusters } from './get_clusters';
import { getStats } from './get_stats';
import { CspRouter } from '../../types';
import { getTrends, Trends } from './get_trends';

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

const getClustersTrends = (clustersWithoutTrends: ClusterWithoutTrend[], trends: Trends) =>
  clustersWithoutTrends.map((cluster) => ({
    ...cluster,
    trend: trends.map(({ timestamp, clusters: clustersTrendData }) => ({
      timestamp,
      ...clustersTrendData[cluster.meta.assetIdentifierId],
    })),
  }));

const getSummaryTrend = (trends: Trends) =>
  trends.map(({ timestamp, summary }) => ({ timestamp, ...summary }));

export const defineGetComplianceDashboardRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: STATS_ROUTE_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: getComplianceDashboardSchema,
          },
        },
      },
      async (context, request, response) => {
        const cspContext = await context.csp;

        try {
          const esClient = cspContext.esClient.asCurrentUser;

          const { id: pitId } = await esClient.openPointInTime({
            index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
            keep_alive: '30s',
          });

          const params: GetComplianceDashboardRequest = request.params;
          const policyTemplate = params.policy_template as PosturePolicyTemplate;

          // runtime mappings create the `safe_posture_type` field, which equals to `kspm` or `cspm` based on the value and existence of the `posture_type` field which was introduced at 8.7
          // the `query` is then being passed to our getter functions to filter per posture type even for older findings before 8.7
          const runtimeMappings: MappingRuntimeFields = getSafePostureTypeRuntimeMapping();
          const query: QueryDslQueryContainer = {
            bool: {
              filter: [{ term: { safe_posture_type: policyTemplate } }],
            },
          };

          const [stats, groupedFindingsEvaluation, clustersWithoutTrends, trends] =
            await Promise.all([
              getStats(esClient, query, pitId, runtimeMappings),
              getGroupedFindingsEvaluation(esClient, query, pitId, runtimeMappings),
              getClusters(esClient, query, pitId, runtimeMappings),
              getTrends(esClient, policyTemplate),
            ]);

          // Try closing the PIT, if it fails we can safely ignore the error since it closes itself after the keep alive
          //   ends. Not waiting on the promise returned from the `closePointInTime` call to avoid delaying the request
          esClient.closePointInTime({ id: pitId }).catch((err) => {
            cspContext.logger.warn(`Could not close PIT for stats endpoint: ${err}`);
          });

          const clusters = getClustersTrends(clustersWithoutTrends, trends);
          const trend = getSummaryTrend(trends);

          const body: ComplianceDashboardData = {
            stats,
            groupedFindingsEvaluation,
            clusters,
            trend,
          };

          return response.ok({
            body,
          });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Error while fetching CSP stats: ${err}`);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
