/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  CSP_INGEST_TIMESTAMP_PIPELINE,
} from '../../common/constants';

export const benchmarkScoreTransform: TransformPutTransformRequest = {
  transform_id: 'cloud_security_posture.score-default-0.0.1',
  description: 'Calculate latest findings score',
  source: {
    index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  },
  dest: {
    index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
    pipeline: CSP_INGEST_TIMESTAMP_PIPELINE,
  },
  frequency: '5m',
  sync: {
    time: {
      field: 'event.ingested',
    },
  },
  pivot: {
    group_by: {
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '5h',
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
