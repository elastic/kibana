/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { VULNERABILITIES_SEVERITY } from '../../../common/constants';

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
  cloud_accounts: {
    value: number;
  };
}

export const getVulnerabilitiesStatisticsQuery = (): SearchRequest => ({
  size: 0,
  query: {
    match_all: {},
  },
  index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
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
    cloud_accounts: {
      cardinality: {
        field: 'cloud.account.id',
      },
    },
  },
});

export const getVulnerabilitiesStatistics = async (esClient: ElasticsearchClient) => {
  const queryResult = await esClient.search<unknown, VulnerabilitiesStatisticsQueryResult>(
    getVulnerabilitiesStatisticsQuery()
  );

  return {
    criticalCount: queryResult.aggregations?.critical.doc_count,
    highCount: queryResult.aggregations?.high.doc_count,
    mediumCount: queryResult.aggregations?.medium.doc_count,
    resourcesScanned: queryResult.aggregations?.resources_scanned.value,
    cloudAccounts: queryResult.aggregations?.cloud_accounts.value,
  };
};
