/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import type { ChangePointType } from '@kbn/es-types/src';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { intervalToSeconds } from '@kbn/apm-data-access-plugin/common/utils/get_preferred_bucket_size_and_data_source';
import { ApmDocumentType } from '../../../../common/document_type';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import { getPreferredDocumentSource } from '../get_trace_metrics';
import { getOutcomeAggregation } from '../../../lib/helpers/transaction_error_rate';

interface ChangePointDetails {
  change_point?: number;
  r_value?: number;
  trend?: string;
  p_value?: number;
}

interface Bucket {
  key: string | number;
  key_as_string?: string;
  doc_count: number;
}

interface ChangePointResult {
  type: Record<ChangePointType, ChangePointDetails>;
  bucket?: Bucket;
}

export interface BucketChangePoints extends Bucket {
  changes_latency: ChangePointResult;
  changes_throughput: ChangePointResult;
  changes_failure_rate: ChangePointResult;
  time_series: {
    buckets: Array<
      Bucket & {
        avg_latency: {
          value: number | null;
        };
        throughput: {
          value: number | null;
        };
        failure_rate: {
          value: number | null;
        };
      }
    >;
  };
}

type DocumentType =
  | ApmDocumentType.ServiceTransactionMetric
  | ApmDocumentType.TransactionMetric
  | ApmDocumentType.TransactionEvent;

export async function getTraceChangePoints({
  apmEventClient,
  apmDataAccessServices,
  start,
  end,
  kqlFilter,
  groupBy,
}: {
  apmEventClient: APMEventClient;
  apmDataAccessServices: ApmDataAccessServices;
  start: number;
  end: number;
  kqlFilter?: string;
  groupBy: string;
}): Promise<BucketChangePoints[]> {
  const source = await getPreferredDocumentSource({
    apmDataAccessServices,
    start,
    end,
    groupBy,
    kqlFilter,
  });

  const { rollupInterval, hasDurationSummaryField } = source;
  const documentType = source.documentType as DocumentType;
  const durationField = getDurationFieldForTransactions(documentType, hasDurationSummaryField);
  const outcomeAggs = getOutcomeAggregation(documentType);
  const bucketSizeInSeconds = intervalToSeconds(rollupInterval);

  const calculateFailedTransactionRate =
    'params.successful_or_failed != null && params.successful_or_failed > 0 ? (params.successful_or_failed - params.success) / params.successful_or_failed : 0';

  const response = await apmEventClient.search('get_trace_change_points', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...kqlQuery(kqlFilter)],
      },
    },
    aggs: {
      groups: {
        terms: {
          field: groupBy,
        },
        aggs: {
          time_series: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: `${bucketSizeInSeconds}s`,
            },
            aggs: {
              ...outcomeAggs,
              avg_latency: {
                avg: {
                  field: durationField,
                },
              },
              failure_rate:
                documentType === ApmDocumentType.ServiceTransactionMetric
                  ? {
                      bucket_script: {
                        buckets_path: {
                          successful_or_failed: 'successful_or_failed',
                          success: 'successful',
                        },
                        script: {
                          source: calculateFailedTransactionRate,
                        },
                      },
                    }
                  : {
                      bucket_script: {
                        buckets_path: {
                          successful_or_failed: 'successful_or_failed>_count',
                          success: 'successful>_count',
                        },
                        script: {
                          source: calculateFailedTransactionRate,
                        },
                      },
                    },
              throughput: {
                bucket_script: {
                  buckets_path: {
                    count: '_count',
                  },
                  script: {
                    source: 'params.count != null ? params.count / (params.bucketSize / 60.0) : 0',
                    params: {
                      bucketSize: bucketSizeInSeconds,
                    },
                  },
                },
              },
            },
          },
          changes_latency: {
            change_point: {
              buckets_path: 'time_series>avg_latency',
            },
            // elasticsearch@9.0.0 change_point aggregation is missing in the types: https://github.com/elastic/elasticsearch-specification/issues/3671
          } as AggregationsAggregationContainer,
          changes_throughput: {
            change_point: {
              buckets_path: 'time_series>throughput',
            },
          } as AggregationsAggregationContainer,
          changes_failure_rate: {
            change_point: {
              buckets_path: 'time_series>failure_rate',
            },
          } as AggregationsAggregationContainer,
        },
      },
    },
  });

  return (response.aggregations?.groups?.buckets as BucketChangePoints[]) ?? [];
}
