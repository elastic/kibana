/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import { createObservabilityServerRoute } from '../create_observability_server_route';

interface DetectedEvent {
  timestamp: Date;
  message: string;
  deviation: number;
  unit: string;
}

const getAllLogs = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const allLogs = await esClient.search({
    index: '*log*',
    size: 0,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            range: {
              ['@timestamp']: {
                gt: moment().subtract(24, 'hours').toISOString(),
                lte: moment().toISOString(),
                format: 'strict_date_optional_time',
              },
            },
          },
          {
            term: {
              ['container.id']: {
                value: 'container-0',
              },
            },
          },
        ],
      },
    },
    aggs: {
      histogram: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: eventsInterval,
        },
      },
    },
  });

  return allLogs.aggregations;
};

const getErrorLogs = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const errorLogs = await esClient.search({
    index: '*log*',
    size: 0,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            range: {
              ['@timestamp']: {
                gt: moment().subtract(24, 'hours').toISOString(),
                lte: moment().toISOString(),
                format: 'strict_date_optional_time',
              },
            },
          },
          {
            term: {
              ['log.level']: {
                value: 'error',
              },
            },
          },
          {
            term: {
              ['container.id']: {
                value: 'container-0',
              },
            },
          },
        ],
      },
    },
    aggs: {
      histogram: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: eventsInterval,
        },
      },
    },
  });

  return errorLogs.aggregations;
};

const getAllServiceLatency = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const allServiceLatency = await esClient.search({
    index: '*apm*',
    size: 0,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            range: {
              ['@timestamp']: {
                gt: moment().subtract(24, 'hours').toISOString(),
                lte: moment().toISOString(),
                format: 'strict_date_optional_time',
              },
            },
          },
          {
            term: {
              ['container.id']: {
                value: 'container-0',
              },
            },
          },
        ],
      },
    },
    aggs: {
      histogram: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: eventsInterval,
        },
        aggs: {
          latency: {
            avg: {
              field: 'transaction.duration.us',
            },
          },
        },
      },
    },
  });

  return allServiceLatency.aggregations;
};

const getServiceLatency = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const serviceLatency = await esClient.search({
    index: '*apm*',
    size: 0,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            range: {
              ['@timestamp']: {
                gt: moment().subtract(24, 'hours').toISOString(),
                lte: moment().toISOString(),
                format: 'strict_date_optional_time',
              },
            },
          },
          {
            term: {
              ['container.id']: {
                value: 'container-0',
              },
            },
          },
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: 'service.name',
        },
        aggs: {
          histogram: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: eventsInterval,
            },
            aggs: {
              latency: {
                avg: {
                  field: 'transaction.duration.us',
                },
              },
            },
          },
        },
      },
    },
  });

  return serviceLatency.aggregations;
};

const calculateRate = (
  timestamp: string,
  curr: number,
  prev: number
): DetectedEvent | undefined => {
  const diff = Math.abs(curr - prev);
  const pctDiff = Math.round((diff * 100) / prev);
  if (pctDiff >= 40) {
    return {
      timestamp: new Date(timestamp),
      message: '',
      deviation: pctDiff,
      unit: '%',
    };
  }
};

const calculateLogRate = ({ histogram }: any, type: string) => {
  const events: DetectedEvent[] = [];
  let prev: number | undefined;

  histogram.buckets.forEach((bucket: any) => {
    const curr = bucket.doc_count;
    if (prev) {
      const event = calculateRate(bucket.key_as_string, curr, prev);
      if (event) {
        const eventType = type === 'allLogs' ? 'Log rate' : 'Error rate';
        event.message = curr > prev ? `${eventType} increase` : `${eventType} decrease`;
        events.push(event);
      }
    }
    prev = curr;
  });

  return events;
};

const calculateOverallLatencyRate = ({ histogram }: any) => {
  const events: DetectedEvent[] = [];
  let prev: number | undefined;

  histogram.buckets.forEach((bucket: any) => {
    const curr = bucket.latency.value || -1;
    if (prev) {
      const event = calculateRate(bucket.key_as_string, curr, prev);
      if (event) {
        event.message =
          curr > prev ? 'Latency increase for all services' : 'Latency decrease for all services';
        events.push(event);
      }
    }
    prev = curr;
  });

  return events;
};

const calculateServiceLatencyRate = ({ services }: any) => {
  const events: DetectedEvent[] = [];
  let prev: number | undefined;

  services.buckets.forEach((service: any) => {
    service.histogram.buckets.forEach((bucket: any) => {
      const curr = bucket.latency.value || -1;
      if (prev) {
        const event = calculateRate(bucket.key_as_string, curr, prev);
        if (event) {
          event.message =
            curr > prev
              ? `Latency increase for service ${service.key}`
              : `Latency decrease for service ${service.key}`;
          events.push(event);
        }
      }
      prev = curr;
    });
  });

  return events;
};

const detectEvents = async (
  esClient: ElasticsearchClient,
  eventsInterval: string | undefined = '1h'
) => {
  const allLogs = await getAllLogs(esClient, eventsInterval);
  const errorLogs = await getErrorLogs(esClient, eventsInterval);
  const allServiceLatency = await getAllServiceLatency(esClient, eventsInterval);
  const serviceLatency = await getServiceLatency(esClient, eventsInterval);

  const allEvents: DetectedEvent[] = [];

  const allLogEvents = calculateLogRate(allLogs, 'allLogs');
  const errorLogEvents = calculateLogRate(errorLogs, 'errorLogs');
  const overallLatencyEvents = calculateOverallLatencyRate(allServiceLatency);
  const serviceLatencyEvents = calculateServiceLatencyRate(serviceLatency);

  allEvents.push(
    ...allLogEvents,
    ...errorLogEvents,
    ...overallLatencyEvents,
    ...serviceLatencyEvents
  );

  return allEvents;
};

const detectEventsRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/detect_events 2024-08-04',
  options: {
    tags: [],
  },
  params: t.type({
    query: t.type({
      eventsInterval: t.union([t.string, t.undefined]),
    }),
  }),
  handler: async ({ context, dependencies, params }) => {
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const events = await detectEvents(esClient, params.query.eventsInterval);
    events.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
    return events;
  },
});

export const recentEventsRouteRepository = detectEventsRoute;
