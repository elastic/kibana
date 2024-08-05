/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { estypes } from '@elastic/elasticsearch';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { GetHostParameters } from '../types';
import { getFilterByIntegration } from '../helpers/query';

export const getFilteredHosts = async ({
  infraMetricsClient,
  from,
  to,
  limit,
  query,
}: Pick<GetHostParameters, 'infraMetricsClient' | 'from' | 'to' | 'limit'> & {
  query: estypes.QueryDslQueryContainer;
}) => {
  const response = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [query, ...rangeQuery(from, to), ...getFilterByIntegration('system')],
        },
      },
      aggs: {
        nodes: {
          terms: {
            size: limit,
            field: HOST_NAME_FIELD,
            order: {
              _key: 'asc',
            },
          },
        },
      },
    },
  });

  const { nodes } = response.aggregations ?? {};
  return nodes?.buckets.map((p) => p.key as string) ?? [];
};

export const hasSystemIntegrationDocs = async ({
  infraMetricsClient,
  from,
  to,
  query,
}: Pick<GetHostParameters, 'infraMetricsClient' | 'from' | 'to'> & {
  query: estypes.QueryDslQueryContainer;
}) => {
  const hitCount = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      terminate_after: 1,
      track_total_hits: true,
      query: {
        bool: {
          filter: [query, ...rangeQuery(from, to), ...getFilterByIntegration('system')],
        },
      },
    },
  });

  return hitCount.hits.total.value > 0;
};
