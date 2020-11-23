/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { keyBy, sum } from 'lodash';
import { ValuesType } from 'utility-types';
import { EventOutcome } from '../../../../common/event_outcome';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { ESSearchHit } from '../../../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Span } from '../../../../typings/es_schemas/ui/span';

export interface ServiceDependencyItem {
  name: string;
  latency: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }>;
  };
  traffic: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }>;
  };
  error_rate: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }>;
  };
  impact: number;
  serviceName?: string;
  environment?: string;
  spanType?: string;
  spanSubtype?: string;
  agentName?: AgentName;
}

const getMetrics = async ({
  start,
  end,
  apmEventClient,
  serviceName,
  environment,
  numBuckets,
}: {
  start: number;
  end: number;
  serviceName: string;
  apmEventClient: APMEventClient;
  environment: string;
  numBuckets: number;
}) => {
  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { exists: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT } },
            { range: rangeFilter(start, end) },
            ...getEnvironmentUiFilterES(environment),
          ],
        },
      },
      aggs: {
        connections: {
          terms: {
            field: SPAN_DESTINATION_SERVICE_RESOURCE,
            size: 100,
          },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: getBucketSize({ start, end, numBuckets })
                  .intervalString,
                extended_bounds: {
                  min: start,
                  max: end,
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
    response.aggregations?.connections.buckets.map((bucket) => ({
      key: bucket.key as string,
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
        x: dateBucket.key,
        count: dateBucket.count.value ?? 0,
        latency_sum: dateBucket.latency_sum.value ?? 0,
        error_count:
          dateBucket[EVENT_OUTCOME].buckets.find(
            (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
          )?.count.value ?? 0,
      })),
    })) ?? []
  );
};

const getDestinationMap = async ({
  apmEventClient,
  serviceName,
  start,
  end,
  environment,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  environment: string;
}) => {
  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.span],
    },
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
            { range: rangeFilter(start, end) },
            ...getEnvironmentUiFilterES(environment),
          ],
        },
      },
      collapse: {
        field: SPAN_DESTINATION_SERVICE_RESOURCE,
        inner_hits: {
          name: EVENT_OUTCOME,
          collapse: { field: EVENT_OUTCOME },
          size: 2,
          _source: [SPAN_ID, SPAN_TYPE, SPAN_SUBTYPE],
        },
      },
      _source: [SPAN_DESTINATION_SERVICE_RESOURCE],
    },
  });

  const outgoingConnections = response.hits.hits.flatMap((hit) => {
    const dest = hit._source.span.destination!.service.resource;
    const innerHits = hit.inner_hits as Record<
      typeof EVENT_OUTCOME,
      { hits: { hits: Array<ESSearchHit<Span>> } }
    >;
    return innerHits['event.outcome'].hits.hits.map((innerHit) => ({
      [SPAN_DESTINATION_SERVICE_RESOURCE]: dest,
      id: innerHit._source.span.id,
      [SPAN_TYPE]: innerHit._source.span.type,
      [SPAN_SUBTYPE]: innerHit._source.span.subtype,
    }));
  });

  const transactionResponse = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      query: {
        bool: {
          filter: [
            {
              terms: {
                [PARENT_ID]: outgoingConnections.map(
                  (connection) => connection.id
                ),
              },
            },
          ],
        },
      },
      size: outgoingConnections.length,
      _source: [SERVICE_NAME, SERVICE_ENVIRONMENT, AGENT_NAME, PARENT_ID],
    },
  });

  const incomingConnections = transactionResponse.hits.hits.map((hit) => ({
    id: hit._source.parent!.id,
    service: {
      name: hit._source.service.name,
      environment: hit._source.service.environment,
      agentName: hit._source.agent.name,
    },
  }));

  const connections = joinByKey(
    joinByKey(
      [...outgoingConnections, ...joinByKey(incomingConnections, 'service')],
      'id'
    ),
    SPAN_DESTINATION_SERVICE_RESOURCE
  );

  // map span.destination.service.resource to an instrumented service (service.name, service.environment)
  // or an external service (span.type, span.subtype)

  return keyBy(connections, SPAN_DESTINATION_SERVICE_RESOURCE);
};

export async function getServiceDependencies({
  setup,
  serviceName,
  environment,
  numBuckets,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment: string;
  numBuckets: number;
}): Promise<ServiceDependencyItem[]> {
  const { start, end, apmEventClient } = setup;

  const [allMetrics, destinationMap] = await Promise.all([
    getMetrics({
      start,
      end,
      apmEventClient,
      serviceName,
      environment,
      numBuckets,
    }),
    getDestinationMap({
      apmEventClient,
      serviceName,
      start,
      end,
      environment,
    }),
  ]);

  const metricsWithMappedDestinations = allMetrics.map((metricItem) => {
    const spanDestination = metricItem.key;

    const destination = destinationMap[spanDestination];

    return {
      destination: destination
        ? destination
        : {
            [SPAN_DESTINATION_SERVICE_RESOURCE]: metricItem.key,
          },
      metrics: [metricItem],
    };
  }, []);

  const metricsJoinedByDestination = joinByKey(
    metricsWithMappedDestinations,
    'destination',
    (a, b) => ({
      ...a,
      ...b,
      metrics: [...(a.metrics ?? []), ...(b.metrics ?? [])],
    })
  );

  const metricsByResolvedAddress = metricsJoinedByDestination.map(
    ({ destination, metrics }) => {
      const mergedMetrics = metrics.reduce<
        Omit<ValuesType<typeof metrics>, 'key'>
      >(
        (prev, current) => {
          return {
            value: {
              count: prev.value.count + current.value.count,
              latency_sum: prev.value.latency_sum + current.value.latency_sum,
              error_count: prev.value.error_count + current.value.error_count,
            },
            timeseries: joinByKey(
              [...prev.timeseries, ...current.timeseries],
              'x',
              (a, b) => ({
                x: a.x,
                count: a.count + b.count,
                latency_sum: a.latency_sum + b.latency_sum,
                error_count: a.error_count + b.error_count,
              })
            ),
          };
        },
        {
          value: {
            count: 0,
            latency_sum: 0,
            error_count: 0,
          },
          timeseries: [],
        }
      );

      const deltaAsMinutes = (end - start) / 60 / 1000;

      const destMetrics = {
        latency: {
          value:
            mergedMetrics.value.count > 0
              ? mergedMetrics.value.latency_sum / mergedMetrics.value.count
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? point.latency_sum / point.count : null,
          })),
        },
        traffic: {
          value:
            mergedMetrics.value.count > 0
              ? mergedMetrics.value.count / deltaAsMinutes
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? point.count / deltaAsMinutes : null,
          })),
        },
        error_rate: {
          value:
            mergedMetrics.value.count > 0
              ? (mergedMetrics.value.error_count ?? 0) /
                mergedMetrics.value.count
              : null,
          timeseries: mergedMetrics.timeseries.map((point) => ({
            x: point.x,
            y: point.count > 0 ? (point.error_count ?? 0) / point.count : null,
          })),
        },
      };

      if ('service' in destination) {
        return {
          name: destination.service!.name,
          serviceName: destination.service!.name,
          environment: destination.service!.environment,
          agentName: destination.service!.agentName,
          ...destMetrics,
        };
      }

      return {
        name: destination[SPAN_DESTINATION_SERVICE_RESOURCE],
        spanType:
          'span.type' in destination ? destination[SPAN_TYPE] : undefined,
        spanSubtype:
          'span.subtype' in destination ? destination[SPAN_SUBTYPE] : undefined,
        ...destMetrics,
      };
    }
  );

  const latencySums = metricsByResolvedAddress
    .map((metrics) => metrics.latency.value)
    .filter((n) => n !== null) as number[];

  const minLatencySum = Math.min(...latencySums);
  const maxLatencySum = Math.max(...latencySums);

  return metricsByResolvedAddress.map((metric) => ({
    ...metric,
    impact:
      metric.latency.value === null
        ? 0
        : ((metric.latency.value - minLatencySum) /
            (maxLatencySum - minLatencySum)) *
          100,
  }));
}
