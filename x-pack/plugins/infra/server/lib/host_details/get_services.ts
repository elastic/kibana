/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import { termQuery } from '@kbn/observability-plugin/server';
import { ESSearchClient } from '../metrics/types';
import {
  Service,
  ServicesAPIRequest,
  ServicesAPIQueryAggregation,
} from '../../../common/http_api/host_details';
import { HOST_NAME_FIELD } from '../../../common/constants'

export const getServices = async (
  client: ESSearchClient,
  apmIndices: APMDataAccessConfig['indices'],
  options: ServicesAPIRequest
) => {
  const { transaction, error, metric } = apmIndices;
  const { filters, size, from, to } = options;
  const filtersList: QueryDslQueryContainer[] = [];


  if (filters['host.name']) {
    // also query for host.hostname field along with host.name, as some services may use this field
    const HOST_HOSTNAME_FIELD = 'host.hostname';
    filtersList.push({
      bool: {
        should: [
          ...termQuery(HOST_NAME_FIELD, filters[HOST_NAME_FIELD]),  
          ...termQuery(HOST_HOSTNAME_FIELD, filters[HOST_NAME_FIELD])
        ],
        minimum_should_match: 1,
      },
    });
  }

  const body = {
    size: 0,
    _source: false,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
          ...filtersList,
        ],
      },
    },
    aggs: {
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
    },
  };
  console.log(JSON.stringify(body, null, 2))
  const result = await client<{}, ServicesAPIQueryAggregation>({
    body,
    index: [transaction, error, metric],
  });

  const servicesListBuckets = result.aggregations?.services?.buckets || [];

  const services = servicesListBuckets.reduce((acc: Service[], bucket) => {
    const serviceName = bucket.key;
    const agentName = bucket.latestAgent.top[0].metrics['agent.name'];

    if (!serviceName) {
      return acc;
    }

    const service: Service = {
      'service.name': serviceName,
      'agent.name': agentName,
    };

    acc.push(service);

    return acc;
  }, []);
  return { services };
};
