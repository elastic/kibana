/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext } from '../../../../../src/plugins/usage_collection/server';
import { CollectorDependencies } from './types';
import { fetchDetectionsMetrics } from './detections';

export type RegisterCollector = (deps: CollectorDependencies) => void;
export interface UsageData {
  detectionMetrics: {};
}

export const registerCollector: RegisterCollector = ({ ml, usageCollection }) => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'security_solution',
    schema: {
      detectionMetrics: {
        ml_jobs: {
          ml_job_usage: {
            custom: {
              enabled: {
                type: 'long',
                _meta: { description: 'The number of custom ML jobs rules enabled' },
              },
              disabled: {
                type: 'long',
                _meta: { description: 'The number of custom ML jobs rules disabled' },
              },
            },
            elastic: {
              enabled: {
                type: 'long',
                _meta: { description: 'The number of elastic provided ML jobs rules enabled' },
              },
              disabled: {
                type: 'long',
                _meta: { description: 'The number of elastic provided ML jobs rules disabled' },
              },
            },
          },
          ml_job_metrics: {
            type: 'array',
            items: {
              job_id: {
                type: 'keyword',
                _meta: { description: 'Identifier for the anomaly detection job' },
              },
              open_time: {
                type: 'keyword',
                _meta: {
                  description:
                    'For open jobs only, the elapsed time for which the job has been open',
                },
              },
              create_time: {
                type: 'keyword',
                _meta: { description: 'The time the job was created' },
              },
              finished_time: {
                type: 'keyword',
                _meta: {
                  description: 'If the job closed or failed, this is the time the job finished',
                },
              },
              state: {
                type: 'keyword',
                _meta: { description: 'The status of the anomaly detection job' },
              },
              data_counts: {
                bucket_count: {
                  type: 'long',
                  _meta: { description: 'The number of buckets processed' },
                },
                empty_bucket_count: {
                  type: 'long',
                  _meta: { description: 'The number of buckets which did not contain any data' },
                },
                input_bytes: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of bytes of input data posted to the anomaly detection job',
                  },
                },
                input_record_count: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of input documents posted to the anomaly detection job',
                  },
                },
                last_data_time: {
                  type: 'long',
                  _meta: {
                    description:
                      'The timestamp at which data was last analyzed, according to server time',
                  },
                },
                processed_record_count: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of input documents that have been processed by the anomaly detection job',
                  },
                },
              },
              model_size_stats: {
                bucket_allocation_failures_count: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of buckets for which new entities in incoming data were not processed due to insufficient model memory',
                  },
                },
                model_bytes: {
                  type: 'long',
                  _meta: { description: 'The number of bytes of memory used by the models' },
                },
                model_bytes_exceeded: {
                  type: 'long',
                  _meta: {
                    description:
                      'The number of bytes over the high limit for memory usage at the last allocation failure',
                  },
                },
                model_bytes_memory_limit: {
                  type: 'long',
                  _meta: {
                    description:
                      'The upper limit for model memory usage, checked on increasing values',
                  },
                },
                peak_model_bytes: {
                  type: 'long',
                  _meta: {
                    description: 'The peak number of bytes of memory ever used by the models',
                  },
                },
              },
              timing_stats: {
                bucket_count: {
                  type: 'long',
                  _meta: { description: 'The number of buckets processed' },
                },
                exponential_average_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: {
                    description:
                      'Exponential moving average of all bucket processing times, in milliseconds',
                  },
                },
                exponential_average_bucket_processing_time_per_hour_ms: {
                  type: 'long',
                  _meta: {
                    description:
                      'Exponentially-weighted moving average of bucket processing times calculated in a 1 hour time window, in milliseconds',
                  },
                },
                maximum_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: {
                    description: 'Maximum among all bucket processing times, in milliseconds',
                  },
                },
                minimum_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: {
                    description: 'Minimum among all bucket processing times, in milliseconds',
                  },
                },
                total_bucket_processing_time_ms: {
                  type: 'long',
                  _meta: { description: 'Sum of all bucket processing times, in milliseconds' },
                },
              },
              datafeed: {
                datafeed_id: {
                  type: 'keyword',
                  _meta: {
                    description:
                      'A numerical character string that uniquely identifies the datafeed',
                  },
                },
                state: {
                  type: 'keyword',
                  _meta: { description: 'The status of the datafeed' },
                },
                timing_stats: {
                  average_search_time_per_bucket_ms: {
                    type: 'long',
                    _meta: { description: 'The average search time per bucket, in milliseconds' },
                  },
                  bucket_count: {
                    type: 'long',
                    _meta: { description: 'The number of buckets processed' },
                  },
                  exponential_average_search_time_per_hour_ms: {
                    type: 'long',
                    _meta: {
                      description: 'The exponential average search time per hour, in milliseconds',
                    },
                  },
                  search_count: {
                    type: 'long',
                    _meta: { description: 'The number of searches run by the datafeed' },
                  },
                  total_search_time_ms: {
                    type: 'long',
                    _meta: {
                      description: 'The total time the datafeed spent searching, in milliseconds',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    isReady: () => true,
    fetch: async ({ soClient }: CollectorFetchContext): Promise<UsageData> => {
      return {
        detectionMetrics: (await fetchDetectionsMetrics(soClient, ml)) || {},
      };
    },
  });

  usageCollection.registerCollector(collector);
};
