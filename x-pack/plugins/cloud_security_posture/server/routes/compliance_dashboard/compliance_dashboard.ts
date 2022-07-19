/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ComplianceDashboardData } from '../../../common/types';
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
      ...clustersTrendData[cluster.meta.clusterId],
    })),
  }));

const getSummaryTrend = (trends: Trends) =>
  trends.map(({ timestamp, summary }) => ({ timestamp, ...summary }));

export const defineGetComplianceDashboardRoute = (router: CspRouter): void =>
  router.get(
    {
      path: STATS_ROUTE_PATH,
      validate: false,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, _, response) => {
      const cspContext = await context.csp;

      try {
        const esClient = cspContext.esClient.asCurrentUser;

        const { id: pitId } = await esClient.openPointInTime({
          index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
          keep_alive: '30s',
        });

        const query: QueryDslQueryContainer = {
          match_all: {},
        };

        const [stats, groupedFindingsEvaluation, clustersWithoutTrends, trends] = await Promise.all(
          [
            getStats(esClient, query, pitId),
            getGroupedFindingsEvaluation(esClient, query, pitId),
            getClusters(esClient, query, pitId),
            getTrends(esClient),
          ]
        );

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
