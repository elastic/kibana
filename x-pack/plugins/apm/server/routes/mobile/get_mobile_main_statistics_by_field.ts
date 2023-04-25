/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import { merge } from 'lodash';
import {
  SERVICE_NAME,
  SESSION_ID,
  TRANSACTION_DURATION,
  ERROR_TYPE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getLatencyValue } from '../../lib/helpers/latency_aggregation_type';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';

interface Props {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  field: string;
}

export interface MobileMainStatisticsResponse {
  mainStatistics: Array<{
    name: string | number;
    latency: number | null;
    throughput: number;
    crashRate?: number;
  }>;
}

export async function getMobileMainStatisticsByField({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  field,
}: Props) {
  async function getMobileTransactionEventStatistics() {
    const response = await apmEventClient.search(
      `get_mobile_main_statistics_by_field`,
      {
        apm: {
          sources: [
            {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
            },
          ],
        },
        body: {
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [
                ...termQuery(SERVICE_NAME, serviceName),
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
                ...kqlQuery(kuery),
              ],
            },
          },
          aggs: {
            main_statistics: {
              terms: {
                field,
                size: 1000,
              },
              aggs: {
                latency: {
                  avg: {
                    field: TRANSACTION_DURATION,
                  },
                },
              },
            },
          },
        },
      }
    );

    return (
      response.aggregations?.main_statistics.buckets.map((bucket) => {
        return {
          name: bucket.key,
          latency: getLatencyValue({
            latencyAggregationType: LatencyAggregationType.avg,
            aggregation: bucket.latency,
          }),
          throughput: calculateThroughputWithRange({
            start,
            end,
            value: bucket.doc_count,
          }),
        };
      }) ?? []
    );
  }

  async function getMobileErrorEventStatistics() {
    const response = await apmEventClient.search(
      `get_mobile_transaction_events_main_statistics_by_field`,
      {
        apm: {
          sources: [
            {
              documentType: ApmDocumentType.ErrorEvent,
              rollupInterval: RollupInterval.None,
            },
          ],
        },
        body: {
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [
                ...termQuery(SERVICE_NAME, serviceName),
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
                ...kqlQuery(kuery),
              ],
            },
          },
          aggs: {
            main_statistics: {
              terms: {
                field,
                size: 1000,
              },
              aggs: {
                sessions: {
                  cardinality: {
                    field: SESSION_ID,
                  },
                },
                crashes: {
                  filter: {
                    term: {
                      [ERROR_TYPE]: 'crash',
                    },
                  },
                },
              },
            },
          },
        },
      }
    );
    return (
      response.aggregations?.main_statistics.buckets.map((bucket) => {
        return {
          name: bucket.key,
          crashRate: bucket.crashes.doc_count / bucket.sessions.value ?? 0,
        };
      }) ?? []
    );
  }

  const [transactioEventStatistics, errorEventStatistics] = await Promise.all([
    getMobileTransactionEventStatistics(),
    getMobileErrorEventStatistics(),
  ]);

  const mainStatistics = merge(transactioEventStatistics, errorEventStatistics);

  return { mainStatistics };
}
