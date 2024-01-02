/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import { ESSearchClient } from '../metrics/types';
import {
  ServiceAsset,
  ServicesAPIRequest,
  ServicesAPIQueryAggregationAggregation,
} from '../../../common/http_api/host_details';

export const getServices = async (
  client: ESSearchClient,
  apmIndices: APMDataAccessConfig['indices'],
  options: ServicesAPIRequest
) => {
  const { transaction, error, metric } = apmIndices;
  const filters: QueryDslQueryContainer[] = [];
  filters.push({
    bool: {
      should: [
        { term: { 'host.name': options.filters['host.name'] } },
        { term: { 'host.hostname': options.filters['host.name'] } },
      ],
      minimum_should_match: 1,
    },
  });

  const body = {
    size: 0,
    _source: false,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: options.from,
                lte: options.to,
              },
            },
          },
          ...filters,
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: 'service.name',
          size: 10,
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
    },
  };

  const result = await client<{}, ServicesAPIQueryAggregationAggregation>({
    body,
    index: [transaction, error, metric],
  });

  const { buckets: servicesListBuckets } = result.aggregations!.services;
  const services = servicesListBuckets.reduce((acc: ServiceAsset[], bucket) => {
    const serviceName = bucket.key;
    const agentName = bucket.latestAgent.top[0].metrics['agent.name'];

    if (!serviceName) {
      return acc;
    }

    const service: ServiceAsset = {
      'service.name': serviceName,
      'agent.name': agentName,
    };

    acc.push(service);

    return acc;
  }, []);

  return { services };
};
