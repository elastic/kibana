/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// "aggs": {
//   "every_30_mins": {
//     "date_histogram": {
//       "field": "@timestamp",
//         "fixed_interval": "30m"
//     },
//     "aggs": {
//       "failed_findings": {
//         "filter": {
//           "term": {
//             "result.evaluation.keyword": "failed"
//           }
//         }
//       },
//       "passed_findings": {
//         "filter": {
//           "term": {
//             "result.evaluation.keyword": "passed"
//           }
//         }
//       }
//     }
//   }
// }

import { ElasticsearchClient } from 'kibana/server';
import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import type { ComplianceDashboardData, Score } from '../../../common/types';

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export const calculatePostureScore = (passed: number, failed: number): Score =>
  roundScore(passed / (passed + failed));

export interface FindingsEvaluationsQueryResult {
  every_30_mins: {
    buckets: Array<{
      key_as_string: string;
      failed_findings: {
        doc_count: number;
      };
      passed_findings: {
        doc_count: number;
      };
    }>
  };
}

export const trendAggsQuery = {
  every_30_mins: {
    date_histogram: {
      field: '@timestamp',
      fixed_interval: '5m',
    },
    aggs: {
      failed_findings: {
        filter: {
          term: {
            'result.evaluation.keyword': 'failed',
          },
        },
      },
      passed_findings: {
        filter: {
          term: {
            'result.evaluation.keyword': 'passed',
          },
        },
      },
    },
  },
};

export const getTrendAggsQuery = (query: QueryDslQueryContainer): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  query,
  aggs: trendAggsQuery,
});

export const getTrendFromTrendAggs = (
  trendsAggs: FindingsEvaluationsQueryResult
): ComplianceDashboardData['trend'] => {
  console.log('trendsAggs', trendsAggs);
  const trend = trendsAggs.every_30_mins.buckets.map((t) => ({
    time: t.key_as_string,
    passed: t.passed_findings.doc_count,
    failed: t.failed_findings.doc_count,
    score: calculatePostureScore(t.passed_findings.doc_count, t.failed_findings.doc_count),
  }));

  // const failedFindings = trendsAggs.every_30_mins.failed_findings.doc_count || 0;
  // const passedFindings = trendsAggs.every_30_mins.passed_findings.doc_count || 0;
  // const totalFindings = failedFindings + passedFindings;
  // if (!totalFindings) throw new Error("couldn't calculate posture score");
  // const postureScore = calculatePostureScore(passedFindings, failedFindings);

  return {
    trend: trend,
  };
};

export const getTrend = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer
): Promise<ComplianceDashboardData['trend']> => {
  const trendQueryResult = await esClient.search<unknown, FindingsEvaluationsQueryResult>(
    getTrendAggsQuery(query),
    { meta: true }
  );
  const trendAggs = trendQueryResult.body.aggregations;
  if (!trendAggs) throw new Error('missing trend aggs');

  return getTrendFromTrendAggs(trendAggs);
};
