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
  deviation?: number;
  unit?: string;
  version?: string;
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
        composite: {
          sources: [
            {
              service: {
                terms: {
                  field: 'service.name',
                },
              },
            },
          ],
          size: 5000,
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

const getServiceVersions = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const serviceVersions = await esClient.search({
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
            exists: {
              field: 'service.version',
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
        composite: {
          sources: [
            {
              service: {
                terms: {
                  field: 'service.name',
                },
              },
            },
          ],
          size: 5000,
        },
        aggs: {
          versions: {
            terms: {
              field: 'service.version',
            },
            aggs: {
              top_versions: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: ['@timestamp', 'service.name', 'service.version'],
                  },
                  sort: [
                    {
                      '@timestamp': {
                        order: 'asc',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  });

  return serviceVersions.aggregations;
};

const getContainerRestarts = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const containerRestarts = await esClient.search({
    index: '*log*',
    size: 5000,
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
          {
            exists: {
              field: 'kubernetes.container.status.restarts',
            },
          },
          {
            range: {
              'kubernetes.container.status.restarts': {
                gt: 0,
              },
            },
          },
        ],
      },
    },
  });

  return containerRestarts.hits.hits;
};

const getContainerFailures = async (esClient: ElasticsearchClient, eventsInterval: string) => {
  const containerRestarts = await esClient.search({
    index: '*log*',
    size: 5000,
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
          {
            term: {
              ['kubernetes.container.status.phase']: {
                value: 'terminated',
              },
            },
          },
          {
            terms: {
              ['kubernetes.container.status.reason']: ['ContainerCannotRun', 'Error', 'OOMKilled'],
            },
          },
        ],
      },
    },
  });

  return containerRestarts.hits.hits;
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
              ? `Latency increase for service ${service.key.service}`
              : `Latency decrease for service ${service.key.service}`;
          events.push(event);
        }
      }
      prev = curr;
    });
  });

  return events;
};

const detectServiceVersionChanges = ({ services }: any) => {
  const versions: Record<string, Array<{ timestamp: Date; serviceVersion: string }>> = {};
  services.buckets.forEach((serviceBucket: any) => {
    const serviceVersionArr: Array<{ timestamp: Date; serviceVersion: string }> = [];
    serviceBucket.versions.buckets.forEach((versionBucket: any) => {
      const source = versionBucket.top_versions.hits.hits[0]._source;
      serviceVersionArr.push({
        timestamp: new Date(source['@timestamp']),
        serviceVersion: source.service.version,
      });
    });
    serviceVersionArr.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
    if (!versions[serviceBucket.key.service]) versions[serviceBucket.key.service] = [];
    versions[serviceBucket.key.service].push(...serviceVersionArr);
  });

  const events: DetectedEvent[] = [];

  Object.keys(versions).forEach((service: any) => {
    let prev: string | undefined;
    versions[service].forEach((versionsArr: any) => {
      const curr = versionsArr.serviceVersion;
      if (prev) {
        if (curr !== prev) {
          const event = {
            timestamp: new Date(versionsArr.timestamp),
            message: `New version release for service ${service}`,
            version: versionsArr.serviceVersion,
          };
          events.push(event);
        }
      }
      prev = curr;
    });
  });

  return events;
};

const detectContainerRestartEvents = (hits: any) => {
  const events: DetectedEvent[] = [];

  hits.forEach((hit: any) => {
    events.push({
      timestamp: new Date(hit._source['@timestamp']),
      message: `Container restart on ${hit._source.container.id}`,
    });
  });

  return events;
};

const detectContainerFailureEvents = (hits: any) => {
  const events: DetectedEvent[] = [];

  hits.forEach((hit: any) => {
    events.push({
      timestamp: new Date(hit._source['@timestamp']),
      message: `Container failure due to ${hit._source.kubernetes.container.status.reason} on ${hit._source.container.id}`,
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

  const serviceVersions = await getServiceVersions(esClient, eventsInterval);
  const serviceVersionEvents = detectServiceVersionChanges(serviceVersions);

  const containerRestarts = await getContainerRestarts(esClient, eventsInterval);
  const containerRestartEvents = detectContainerRestartEvents(containerRestarts);

  const containerFailures = await getContainerFailures(esClient, eventsInterval);
  const containerFailureEvents = detectContainerFailureEvents(containerFailures);

  const allEvents: DetectedEvent[] = [];

  const allLogEvents = calculateLogRate(allLogs, 'allLogs');
  const errorLogEvents = calculateLogRate(errorLogs, 'errorLogs');
  const overallLatencyEvents = calculateOverallLatencyRate(allServiceLatency);
  const serviceLatencyEvents = calculateServiceLatencyRate(serviceLatency);

  allEvents.push(
    ...allLogEvents,
    ...errorLogEvents,
    ...overallLatencyEvents,
    ...serviceLatencyEvents,
    ...serviceVersionEvents,
    ...containerRestartEvents,
    ...containerFailureEvents
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
