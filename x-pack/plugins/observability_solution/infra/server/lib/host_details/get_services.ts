/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import { termQuery } from '@kbn/observability-plugin/server';
import { PROCESSOR_EVENT } from '@kbn/observability-shared-plugin/common/field_names/elasticsearch';
import { ESSearchClient } from '../metrics/types';
import {
  ServicesAPIRequest,
  ServicesAPIQueryAggregation,
} from '../../../common/http_api/host_details';
import { HOST_NAME_FIELD } from '../../../common/constants';

export const getServices = async (
  client: ESSearchClient,
  apmIndices: APMDataAccessConfig['indices'],
  options: ServicesAPIRequest
) => {
  const { error, metric } = apmIndices;
  const { filters, size = 10, from, to } = options;
  const commonFiltersList: QueryDslQueryContainer[] = [
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
        },
      },
    },
    {
      exists: {
        field: 'service.name',
      },
    },
  ];

  if (filters['host.name']) {
    // also query for host.hostname field along with host.name, as some services may use this field
    const HOST_HOSTNAME_FIELD = 'host.hostname';
    commonFiltersList.push({
      bool: {
        should: [
          ...termQuery(HOST_NAME_FIELD, filters[HOST_NAME_FIELD]),
          ...termQuery(HOST_HOSTNAME_FIELD, filters[HOST_NAME_FIELD]),
        ],
        minimum_should_match: 1,
      },
    });
  }
  const aggs = {
    services: {
      terms: {
        field: 'service.name',
        size,
      },
      aggs: {
        latestAgent: {
          top_metrics: {
            metrics: [{ field: 'agent.name' }],
            sort: {
              '@timestamp': 'desc',
            },
            size: 1,
          },
        },
      },
    },
  };
  // get services from transaction metrics
  const metricsQuery = {
    size: 0,
    _source: false,
    query: {
      bool: {
        filter: [
          {
            term: {
              [PROCESSOR_EVENT]: 'metric',
            },
          },
          {
            bool: {
              should: [
                {
                  term: {
                    'metricset.name': 'app',
                  },
                },
                {
                  bool: {
                    must: [
                      {
                        term: {
                          'metricset.name': 'transaction',
                        },
                      },
                      {
                        term: {
                          'metricset.interval': '1m', // make this dynamic if we start returning time series data
                        },
                      },
                    ],
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
    aggs,
  };
  // get services from logs
  const logsQuery = {
    size: 0,
    _source: false,
    query: {
      bool: {
        filter: commonFiltersList,
      },
    },
    aggs,
  };

  const resultMetrics = await client<{}, ServicesAPIQueryAggregation>({
    body: metricsQuery,
    index: [metric],
  });
  const resultLogs = await client<{}, ServicesAPIQueryAggregation>({
    body: logsQuery,
    index: [error],
  });

  const servicesListBucketsFromMetrics = resultMetrics.aggregations?.services?.buckets || [];
  const servicesListBucketsFromLogs = resultLogs.aggregations?.services?.buckets || [];
  const serviceMap = [...servicesListBucketsFromMetrics, ...servicesListBucketsFromLogs].reduce(
    (acc, bucket) => {
      const serviceName = bucket.key;
      const latestAgentEntry = bucket.latestAgent.top[0];
      const latestTimestamp = latestAgentEntry.sort[0];
      const agentName = latestAgentEntry.metrics['agent.name'];
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
