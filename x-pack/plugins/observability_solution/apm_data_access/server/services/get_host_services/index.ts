/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  AGENT_NAME,
  HOST_HOSTNAME,
  HOST_NAME,
  METRICSET_NAME,
  SERVICE_NAME,
} from '@kbn/apm-types/es_fields';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  RollupInterval,
  TimeRangeMetadata,
  getBucketSize,
  getPreferredBucketSizeAndDataSource,
} from '../../../common';
import { ApmDocumentType } from '../../../common/document_type';
import type { ApmDataAccessServicesParams } from '../get_services';

const MAX_SIZE = 1000;

export interface HostServicesRequest {
  filters: Record<string, string>;
  start: number;
  end: number;
  size?: number;
  documentSources: TimeRangeMetadata['sources'];
}

const suitableTypes = [ApmDocumentType.TransactionMetric, ApmDocumentType.ErrorEvent];

export function createGetHostServices({ apmEventClient }: ApmDataAccessServicesParams) {
  return async ({ start, end, size = MAX_SIZE, filters, documentSources }: HostServicesRequest) => {
    const sourcesToUse = getPreferredBucketSizeAndDataSource({
      sources: documentSources.filter((s) => suitableTypes.includes(s.documentType)),
      bucketSizeInSeconds: getBucketSize({ start, end, numBuckets: 50 }).bucketSize,
    });

    const commonFiltersList: QueryDslQueryContainer[] = [
      ...rangeQuery(start, end),
      {
        exists: {
          field: SERVICE_NAME,
        },
      },
    ];

    if (filters[HOST_NAME]) {
      commonFiltersList.push({
        bool: {
          should: [
            ...termQuery(HOST_NAME, filters[HOST_NAME]),
            ...termQuery(HOST_HOSTNAME, filters[HOST_HOSTNAME]),
          ],
          minimum_should_match: 1,
        },
      });
    }
    // get services from transaction metrics
    const metricsQuery = await apmEventClient.search('get_apm_host_services_from_metrics', {
      apm: {
        sources: [
          {
            documentType: ApmDocumentType.TransactionMetric,
            rollupInterval: RollupInterval.OneMinute,
          },
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    ...termQuery(METRICSET_NAME, 'app'),
                    {
                      bool: {
                        must: [...termQuery(METRICSET_NAME, 'transaction')],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              ...commonFiltersList,
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              field: SERVICE_NAME,
              size,
            },
            aggs: {
              latestAgent: {
                top_metrics: {
                  metrics: [{ field: AGENT_NAME }],
                  sort: {
                    '@timestamp': 'desc',
                  },
                  size: 1,
                },
              },
            },
          },
        },
      },
    });

    // get services from logs
    const logsQuery = await apmEventClient.search('get_apm_host_services_from_logs', {
      apm: {
        sources: [
          {
            documentType: ApmDocumentType.ErrorEvent,
            rollupInterval: sourcesToUse.source.rollupInterval,
          },
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: commonFiltersList,
          },
        },
        aggs: {
          services: {
            terms: {
              field: SERVICE_NAME,
              size,
            },
            aggs: {
              latestAgent: {
                top_metrics: {
                  metrics: [{ field: AGENT_NAME }],
                  sort: {
                    '@timestamp': 'desc',
                  },
                  size: 1,
                },
              },
            },
          },
        },
      },
    });

    const servicesListBucketsFromMetrics = metricsQuery.aggregations?.services.buckets || [];
    const servicesListBucketsFromLogs = logsQuery.aggregations?.services.buckets || [];
    const serviceMap = [...servicesListBucketsFromMetrics, ...servicesListBucketsFromLogs].reduce(
      (acc, bucket) => {
        const serviceName = bucket.key as string;
        const latestAgentEntry = bucket.latestAgent.top[0];
        const latestTimestamp = latestAgentEntry.sort[0] as string;
        const agentName = latestAgentEntry.metrics[AGENT_NAME] as string | null;
        // dedup and get the latest timestamp
        const existingService = acc.get(serviceName);
        if (!existingService || existingService.latestTimestamp < latestTimestamp) {
          acc.set(serviceName, { latestTimestamp, agentName });
        }
        return acc;
      },
      new Map<string, { latestTimestamp: string; agentName: string | null }>()
    );
    const services = Array.from(serviceMap)
      .slice(0, size)
      .map(([serviceName, { agentName }]) => ({
        serviceName,
        agentName,
      }));
    return { services };
  };
}
