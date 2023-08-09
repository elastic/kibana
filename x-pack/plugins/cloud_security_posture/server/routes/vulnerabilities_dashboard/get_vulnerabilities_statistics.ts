/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_SEVERITY,
} from '../../../common/constants';

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
      filter: { term: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.CRITICAL } },
    },
    high: {
      filter: { term: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.HIGH } },
    },
    medium: {
      filter: { term: { 'vulnerability.severity': VULNERABILITIES_SEVERITY.MEDIUM } },
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

export const getVulnerabilitiesStatistics = async (
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
