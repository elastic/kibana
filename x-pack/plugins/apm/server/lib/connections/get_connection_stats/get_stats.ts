/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import objectHash from 'object-hash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../common/environment_filter_values';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
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
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeQuery } from '../../../../../observability/server';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { EventOutcome } from '../../../../common/event_outcome';
import { Setup } from '../../helpers/setup_request';
import { NodeType } from '../../../../common/connections';
import { excludeRumExitSpansQuery } from '../exclude_rum_exit_spans_query';

export const getStats = async ({
  setup,
  start,
  end,
  filter,
  numBuckets,
  offset,
}: {
  setup: Setup;
  start: number;
  end: number;
  filter: QueryDslQueryContainer[];
  numBuckets: number;
  offset?: string;
}) => {
  const { apmEventClient } = setup;

  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const response = await apmEventClient.search('get_connection_stats', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          filter: [
            ...filter,
            {
              exists: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
              },
            },
            ...rangeQuery(startWithOffset, endWithOffset),
            ...excludeRumExitSpansQuery(),
          ],
        },
      },
      aggs: {
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
                backendName: {
                  terms: {
                    field: SPAN_DESTINATION_SERVICE_RESOURCE,
                  },
                },
              },
            ] as const),
          },
          aggs: {
            sample: {
              top_metrics: {
                size: 1,
                metrics: asMutableArray([
                  {
                    field: SERVICE_ENVIRONMENT,
                  },
                  {
                    field: AGENT_NAME,
                  },
                  {
                    field: SPAN_TYPE,
                  },
                  {
                    field: SPAN_SUBTYPE,
                  },
                ] as const),
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
            total_latency_sum: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
              },
            },
            total_latency_count: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
              },
            },
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: getBucketSize({
                  start: startWithOffset,
                  end: endWithOffset,
                  numBuckets,
                  minBucketSize: 60,
                }).intervalString,
                extended_bounds: {
                  min: startWithOffset,
                  max: endWithOffset,
                },
              },
              aggs: {
                latency_sum: {
                  sum: {
                    field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
                  },
                },
                count: {
                  sum: {
                    field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                  },
                },
                [EVENT_OUTCOME]: {
                  terms: {
                    field: EVENT_OUTCOME,
                  },
                  aggs: {
                    count: {
                      sum: {
                        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
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
  });

  return (
    response.aggregations?.connections.buckets.map((bucket) => {
      const sample = bucket.sample.top[0].metrics;
      const serviceName = bucket.key.serviceName as string;
      const backendName = bucket.key.backendName as string;

      return {
        from: {
          id: objectHash({ serviceName }),
          serviceName,
          environment: (sample[SERVICE_ENVIRONMENT] ||
            ENVIRONMENT_NOT_DEFINED.value) as string,
          agentName: sample[AGENT_NAME] as AgentName,
          type: NodeType.service as const,
        },
        to: {
          id: objectHash({ backendName }),
          backendName,
          spanType: sample[SPAN_TYPE] as string,
          spanSubtype: (sample[SPAN_SUBTYPE] || '') as string,
          type: NodeType.backend as const,
        },
        value: {
          count: sum(
            bucket.timeseries.buckets.map(
              (dateBucket) => dateBucket.count.value ?? 0
            )
          ),
          latency_sum: sum(
            bucket.timeseries.buckets.map(
              (dateBucket) => dateBucket.latency_sum.value ?? 0
            )
          ),
          error_count: sum(
            bucket.timeseries.buckets.flatMap(
              (dateBucket) =>
                dateBucket[EVENT_OUTCOME].buckets.find(
                  (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
                )?.count.value ?? 0
            )
          ),
        },
        timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key + offsetInMs,
          count: dateBucket.count.value ?? 0,
          latency_sum: dateBucket.latency_sum.value ?? 0,
          error_count:
            dateBucket[EVENT_OUTCOME].buckets.find(
              (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
            )?.count.value ?? 0,
        })),
      };
    }) ?? []
  );
};
