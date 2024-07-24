/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { RegisterParams } from '../register_services';

export interface ServicesHostNamesParams {
  query: estypes.QueryDslQueryContainer;
  from: number;
  to: number;
  limit: number;
}

export function createGetServicesHostNames(params: RegisterParams) {
  return async ({ from: timeFrom, to: timeTo, query, limit }: ServicesHostNamesParams) => {
    const { apmIndices, esClient } = await params.getResourcesForServices();

    const esResponse = await esClient.search({
      index: [apmIndices.metric, apmIndices.transaction, apmIndices.span, apmIndices.error],
      track_total_hits: false,
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          filter: [query, ...rangeQuery(timeFrom, timeTo)],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: 'host.name',
            size: limit,
          },
        },
      },
    });

    return esResponse.aggregations?.hostNames.buckets.map((bucket) => bucket.key as string) ?? [];
  };
}
