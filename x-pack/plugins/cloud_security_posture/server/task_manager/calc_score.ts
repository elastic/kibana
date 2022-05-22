/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AggregationsAggregationContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core/server';

import {
  //   BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../common/constants';

export class RunScoreTask {
  readonly esClient: ElasticsearchClient | undefined;
  constructor(private logger: Logger, esClient: ElasticsearchClient) {
    this.esClient = esClient;
  }
  // constructor(private readonly logger: Logger, private runScoreTask: RunScoreTask) {}
  async start() {}
  async aggregateLatestFindings() {
    try {
      console.log('@@@@@@@@@@@@@@@@@@@@');
      const evaluationsQueryResult = await this.esClient?.search(this.getScoreQuery());
      console.log({ evaluationsQueryResult });
    } catch (existErr) {
      this.logger.error('Failed to fetch CSP latest Findings');
      //   return false;
    }
  }

  getScoreQuery = (): SearchRequest => ({
    index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    query: {
      match_all: {},
    },
    size: 0,
    aggs: { scoreAggregation: this.benchmarkScoreTransform },
  });

  benchmarkScoreTransform: AggregationsAggregationContainer = {
    aggregations: {
      total_findings: {
        value_count: {
          field: 'result.evaluation.keyword',
        },
      },
      passed_findings: {
        filter: {
          term: {
            'result.evaluation.keyword': 'passed',
          },
        },
      },
      failed_findings: {
        filter: {
          term: {
            'result.evaluation.keyword': 'failed',
          },
        },
      },
      score_by_cluster_id: {
        terms: {
          field: 'cluster_id.keyword',
        },
        aggregations: {
          total_findings: {
            value_count: {
              field: 'result.evaluation.keyword',
            },
          },
          passed_findings: {
            filter: {
              term: {
                'result.evaluation.keyword': 'passed',
              },
            },
          },
          failed_findings: {
            filter: {
              term: {
                'result.evaluation.keyword': 'failed',
              },
            },
          },
        },
      },
    },
  };
}
