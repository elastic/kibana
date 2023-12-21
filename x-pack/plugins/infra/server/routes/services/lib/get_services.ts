/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { estypes } from '@elastic/elasticsearch';
import { ServiceAsset, GetServicesResponse } from '../../../../common/http_api/services';
import { GetServicesOptions } from './types';

export const getServices = async (options: GetServicesOptions): Promise<GetServicesResponse> => {
  const { transaction, error, metric } = options.apmIndices;
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

  const dsl: estypes.SearchRequest = {
    index: [transaction, error, metric],
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
  const esResponse = await options.searchClient.search(dsl);

  const { buckets = [] } = (esResponse.aggregations?.services || {}) as any;
  const services = buckets.reduce((acc: ServiceAsset[], bucket: any) => {
    const serviceName = bucket.key;
    const agentName = bucket.latestAgent.top[0]?.metrics['agent.name'];

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
