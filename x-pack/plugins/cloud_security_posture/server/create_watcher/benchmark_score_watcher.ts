/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatcherPutWatchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../common/constants';

export const benchmarkScoreWatcher: WatcherPutWatchRequest = {
  id: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  transform: { search: { request: {}, timeout: {} } },
  trigger: {
    schedule: {
      interval: '5m',
    },
  },
  input: {
    search: {
      request: {
        indices: ['logs-cloud_security_posture.findings_latest-*'],
        body: {
          size: 0,
          query: {
            match_all: {},
          },
          aggs: {
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
      },
    },
  },
  condition: {
    always: {},
  },
  actions: {
    index_payload: {
      index: {
        index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      },
    },
  },
};
