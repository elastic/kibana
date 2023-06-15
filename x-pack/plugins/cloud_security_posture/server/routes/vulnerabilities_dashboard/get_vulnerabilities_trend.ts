/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { VulnScoreTrend } from '../../../common/types';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';

export const getVulnTrendsQuery = () => ({
  index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  // large number that should be sufficient for 30 days considering we write to the score index every 5 minutes
  size: 9999,
  sort: '@timestamp:desc',
  query: {
    bool: {
      filter: [{ term: { policy_template: VULN_MGMT_POLICY_TEMPLATE } }],
      must: {
        range: {
          '@timestamp': {
            gte: 'now-7d',
            lte: 'now',
          },
        },
      },
    },
  },
});

export const getVulnerabilitiesTrends = async (
  esClient: ElasticsearchClient
): Promise<VulnScoreTrend[]> => {
  const vulnTrendsQueryResult = await esClient.search<VulnScoreTrend>(getVulnTrendsQuery());
  if (!vulnTrendsQueryResult.hits.hits) throw new Error('missing trend results from score index');

  const vulnScoreTrendDocs = vulnTrendsQueryResult.hits.hits.map((hit) => {
    if (!hit._source) throw new Error('missing _source data for one or more of trend results');
    return hit._source;
  });

  return vulnScoreTrendDocs;
};
