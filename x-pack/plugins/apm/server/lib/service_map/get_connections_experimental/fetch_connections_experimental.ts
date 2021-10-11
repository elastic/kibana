/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/api/types';
import { rangeQuery } from '../../../../../observability/server';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import { ProcessorEvent } from '../../../../common/processor_event';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { withApmSpan } from '../../../utils/with_apm_span';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';

export async function fetchConnectionsExperimental({
  start,
  end,
  apmEventClient,
}: {
  start: number;
  end: number;
  apmEventClient: APMEventClient;
}) {
  function getSearch<
    TAggs extends Record<string, AggregationsAggregationContainer>
  >(filter: QueryDslQueryContainer[], aggs: TAggs) {
    return {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [...rangeQuery(start, end), ...filter],
          },
        },
        runtime_mappings: {
          'span.destination.service.hash': {
            type: 'keyword' as const,
          },
          'transaction.upstream.hash': {
            type: 'keyword' as const,
          },
        },
        aggs,
      },
    };
  }

  const [spanConnectionsResponse, transactionConnectionsResponse] =
    await withApmSpan('get_connections_experimental', () =>
      Promise.all([
        apmEventClient.search(
          'get_span_connections_experimental',
          getSearch([{ term: { 'metricset.name': 'span_destination' } }], {
            connections: {
              composite: {
                size: 10000,
                sources: asMutableArray([
                  {
                    serviceName: {
                      terms: {
                        field: SERVICE_NAME,
                      },
                    },
                  },
                  {
                    upstreamHash: {
                      terms: {
                        field: 'transaction.upstream.hash',
                        missing_bucket: true,
                      },
                    },
                  },
                  {
                    downstreamHash: {
                      terms: {
                        field: 'span.destination.service.hash',
                        missing_bucket: true,
                      },
                    },
                  },
                ] as const),
              },
              aggs: {
                latest: {
                  top_metrics: {
                    size: 1,
                    metrics: asMutableArray([
                      { field: AGENT_NAME },
                      { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                      { field: SPAN_TYPE },
                      { field: SPAN_SUBTYPE },
                      { field: SERVICE_ENVIRONMENT },
                    ] as const),
                    sort: {
                      '@timestamp': 'desc' as const,
                    },
                  },
                },
                failed: {
                  filter: {
                    term: { [EVENT_OUTCOME]: EventOutcome.failure },
                  },
                  aggs: {
                    count: {
                      sum: {
                        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                      },
                    },
                  },
                },
                successful: {
                  filter: {
                    term: { [EVENT_OUTCOME]: EventOutcome.success },
                  },
                  aggs: {
                    count: {
                      sum: {
                        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                      },
                    },
                  },
                },
                count: {
                  sum: {
                    field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                  },
                },
                latency: {
                  sum: {
                    field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
                  },
                },
              },
            },
          })
        ),
        apmEventClient.search(
          'get_transaction_connections_experimental',
          getSearch([{ term: { 'metricset.name': 'transaction' } }], {
            connections: {
              composite: {
                size: 10000,
                sources: asMutableArray([
                  {
                    serviceName: {
                      terms: {
                        field: SERVICE_NAME,
                      },
                    },
                  },
                  {
                    upstreamHash: {
                      terms: {
                        field: 'transaction.upstream.hash',
                        missing_bucket: true,
                      },
                    },
                  },
                ] as const),
              },
              aggs: {
                latest: {
                  top_metrics: {
                    size: 1,
                    metrics: asMutableArray([
                      { field: AGENT_NAME },
                      { field: SERVICE_ENVIRONMENT },
                    ] as const),
                    sort: {
                      '@timestamp': 'desc' as const,
                    },
                  },
                },
              },
            },
          })
        ),
      ])
    );

  return {
    spanConnectionsResponse:
      spanConnectionsResponse.aggregations?.connections.buckets,
    transactionConnectionsResponse:
      transactionConnectionsResponse.aggregations?.connections.buckets,
  };
}

export type SpanConnectionsResponse = PromiseReturnType<
  typeof fetchConnectionsExperimental
>['spanConnectionsResponse'];
export type TransactionConnectionsResponse = PromiseReturnType<
  typeof fetchConnectionsExperimental
>['transactionConnectionsResponse'];
