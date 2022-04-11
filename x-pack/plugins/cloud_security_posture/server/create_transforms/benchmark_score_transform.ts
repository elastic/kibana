/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  LATEST_FINDINGS_INDEX_PATTERN,
  BENCHMARK_SCORE_INDEX_PATTERN,
} from '../../common/constants';

export const benchmarkScoreTransform: TransformPutTransformRequest = {
  transform_id: 'cis_kubernetes_benchmark.score-default-0.0.1',
  description: 'Calculate latest findings score',
  source: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
  },
  dest: {
    index: BENCHMARK_SCORE_INDEX_PATTERN,
  },
  frequency: '30m',
  sync: {
    time: {
      field: 'event.ingested',
      delay: '60s',
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: '30d',
    },
  },
  pivot: {
    group_by: {
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: '1m',
        },
      },
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
  },
  _meta: {
    managed: 'true',
  },
};
