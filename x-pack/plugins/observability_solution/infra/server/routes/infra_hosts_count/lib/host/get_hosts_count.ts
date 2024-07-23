/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';
import { HOST_NAME_FIELD } from '../../../../../common/constants';

export async function getHostsCount({
  infraMetricsClient,
  query,
  kuery,
  from,
  to,
}: {
  infraMetricsClient: InfraMetricsClient;
  query?: Record<string, unknown>;
  kuery?: string;
  from: string;
  to: string;
}) {
  const rangeQuery = [
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
        },
      },
    },
  ];
  const queryFilter = (query?.filter as QueryDslQueryContainer[]) ?? [];
  const queryBool = query ?? {};

  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          ...queryBool,
          filter: [
            ...queryFilter,
            ...rangeQuery,
            ...kqlQuery(kuery),
            {
              bool: {
                should: [
                  {
                    term: {
                      'event.module': 'system',
                    },
                  },
                  {
                    term: {
                      'metricset.module': 'system',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        count: {
          cardinality: {
            field: HOST_NAME_FIELD,
          },
        },
      },
    },
  };

  const result = await infraMetricsClient.search(params);

  return result.aggregations?.count.value ?? 0;
}
