/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CnvmDashboardData } from '../../../common/types';
import {
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_STATS_ROUTE_PATH,
} from '../../../common/constants';
import { CspRouter } from '../../types';

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

export interface VulnerabilitiesStatisticsQueryResult {
  critical: {
    doc_count: number;
  };
  high: {
    doc_count: number;
  };
  medium: {
    doc_count: number;
  };
  resources_scanned: {
    value: number;
  };
  cloud_regions: {
    value: number;
  };
}

export const getVulnerabilitiesStatisticsQuery = (
  query: QueryDslQueryContainer
): SearchRequest => ({
  size: 0,
  query,
  index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  aggs: {
    critical: {
      filter: { term: { 'vulnerability.severity': 'CRITICAL' } },
    },
    high: {
      filter: { term: { 'vulnerability.severity': 'HIGH' } },
    },
    medium: {
      filter: { term: { 'vulnerability.severity': 'MEDIUM' } },
    },
    resources_scanned: {
      cardinality: {
        field: 'resource.id',
      },
    },
    cloud_regions: {
      cardinality: {
        field: 'cloud.region',
      },
    },
  },
});

const getVulnerabilitiesStatistics = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer
) => {
  const queryResult = await esClient.search<unknown, VulnerabilitiesStatisticsQueryResult>(
    getVulnerabilitiesStatisticsQuery(query)
  );

  return {
    criticalCount: queryResult.aggregations?.critical.doc_count,
    highCount: queryResult.aggregations?.high.doc_count,
    mediumCount: queryResult.aggregations?.medium.doc_count,
    resourcesScanned: queryResult.aggregations?.resources_scanned.value,
    cloudRegions: queryResult.aggregations?.cloud_regions.value,
  };
};

export const defineGetVulnerabilitiesDashboardRoute = (router: CspRouter): void =>
  router.get(
    {
      path: VULNERABILITIES_STATS_ROUTE_PATH,
      validate: false,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, request, response) => {
      const cspContext = await context.csp;

      try {
        const esClient = cspContext.esClient.asCurrentUser;

        const query: QueryDslQueryContainer = {
          bool: {
            filter: [
              { exists: { field: 'vulnerability.score.base' } },
              { exists: { field: 'vulnerability.score.version' } },
              { exists: { field: 'vulnerability.severity' } },
              { exists: { field: 'resource.name' } },
              { match_phrase: { 'vulnerability.enumeration': 'CVE' } },
            ],
            must_not: [{ match_phrase: { 'vulnerability.severity': 'UNKNOWN' } }],
          },
        };

        const [cnvmStatistics] = await Promise.all([getVulnerabilitiesStatistics(esClient, query)]);

        const body: CnvmDashboardData = {
          cnvmStatistics,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Error while fetching Vulnerabilities stats: ${err}`);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
