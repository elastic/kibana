/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import objectHash from 'object-hash';
import { rangeQuery, termsQuery } from '../../../../observability/server';
import {
  SERVICE_NAME,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { TraceMetricFetcher } from './trace_metric_fetcher';

interface TraceOperation {
  serviceName: string;
  spanName: string;
  spanType: string;
  spanSubtype: string;
  id: string;
  count: number;
  totalLatency: number;
}

export type TraceOperationsResponse = TraceOperation[];

const MAX_PAGES = 3;
const PAGINATION_SIZE = 10000;

export const traceOperationsFetcher: TraceMetricFetcher<TraceOperationsResponse> =
  async ({ start, end, prev, traceIds, apmEventClient }) => {
    const numPages = 0;

    const operations: TraceOperation[] = [];

    async function getOperations(
      afterKey?: Record<string, any>
    ): Promise<TraceOperation[]> {
      const response = await apmEventClient.search('get_operations_page', {
        apm: {
          events: [ProcessorEvent.span],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                ...rangeQuery(start, end),
                ...termsQuery(TRACE_ID, ...traceIds),
              ],
            },
          },
          aggs: {
            operations: {
              composite: {
                size: PAGINATION_SIZE,
                ...(afterKey ? { after: afterKey } : {}),
                sources: asMutableArray([
                  {
                    serviceName: {
                      terms: {
                        field: SERVICE_NAME,
                      },
                    },
                  },
                  {
                    spanType: {
                      terms: {
                        field: SPAN_TYPE,
                      },
                    },
                  },
                  {
                    spanSubtype: {
                      terms: {
                        field: SPAN_SUBTYPE,
                      },
                    },
                  },
                  {
                    spanName: {
                      terms: {
                        field: SPAN_NAME,
                      },
                    },
                  },
                ] as const),
              },
              aggs: {
                composite_spans: {
                  filter: {
                    bool: {
                      filter: [
                        {
                          exists: {
                            field: 'span.composite.count',
                          },
                        },
                      ],
                    },
                  },
                  aggs: {
                    count: {
                      sum: {
                        field: 'span.composite.count',
                      },
                    },
                    total_latency: {
                      sum: {
                        field: 'span.composite.sum.us',
                      },
                    },
                  },
                },
                non_composite_spans: {
                  filter: {
                    bool: {
                      must_not: [{ exists: { field: 'span.composite.count' } }],
                    },
                  },
                  aggs: {
                    total_latency: {
                      sum: {
                        field: 'span.duration.us',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      operations.push(
        ...(response.aggregations?.operations.buckets.map((bucket) => {
          const props = {
            serviceName: bucket.key.serviceName as string,
            spanType: bucket.key.spanType as string,
            spanSubtype: bucket.key.spanSubtype as string,
            spanName: bucket.key.spanName as string,
          };

          return {
            ...props,
            id: objectHash(props),
            count:
              (bucket.composite_spans.count.value ?? 0) +
              bucket.non_composite_spans.doc_count,
            totalLatency:
              (bucket.composite_spans.total_latency.value ?? 0) +
              (bucket.non_composite_spans.total_latency.value ?? 0),
          };
        }) ?? [])
      );

      if (
        (response.aggregations?.operations.buckets.length ?? 0) <
        PAGINATION_SIZE
      ) {
        return operations;
      }

      if (response.aggregations?.operations.after_key && numPages < MAX_PAGES) {
        return getOperations(response.aggregations.operations.after_key);
      }

      return operations;
    }

    const nextOperations = await getOperations();
    const prevOperationsById = keyBy(prev ?? [], 'id');

    return nextOperations.map((operation) => {
      const prevOperation = prevOperationsById[operation.id];
      return {
        ...operation,
        count: (prevOperation?.count ?? 0) + operation.count,
        totalLatency:
          (prevOperation?.totalLatency ?? 0) + operation.totalLatency,
      };
    });
  };
