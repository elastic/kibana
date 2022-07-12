/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  QueryDslBoolQuery,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery } from '@kbn/observability-plugin/server';

export interface ProjectTimeQuery {
  bool: QueryDslBoolQuery;
}

export function createCommonFilter({
  projectID,
  kuery,
  timeFrom,
  timeTo,
}: {
  projectID: string;
  kuery: string;
  timeFrom: string;
  timeTo: string;
}): ProjectTimeQuery {
  return {
    bool: {
      filter: [
        {
          term: {
            ProjectID: projectID,
          },
        },
        ...kqlQuery(kuery),
        {
          range: {
            '@timestamp': {
              gte: timeFrom,
              lt: timeTo,
              format: 'epoch_second',
              boost: 1.0,
            },
          },
        },
      ],
    },
  };
}

export function autoHistogramSumCountOnGroupByField(
  searchField: string,
  topNItems: number
): AggregationsAggregationContainer {
  return {
    auto_date_histogram: {
      field: '@timestamp',
      buckets: 50,
    },
    aggs: {
      group_by: {
        terms: {
          field: searchField,
          // We remove the ordering since we will rely directly on the natural
          // ordering of Elasticsearch: by default this will be the descending count
          // of matched documents. This is not equal to the ordering by sum of Count field,
          // but it's a good-enough approximation given the distribution of Count.
          size: topNItems,
          // 'execution_hint: map' skips the slow building of ordinals that we don't need.
          // Especially with high cardinality fields, this setting speeds up the aggregation.
          execution_hint: 'map',
        },
        aggs: {
          count: {
            sum: {
              field: 'Count',
            },
          },
        },
      },
    },
  };
}
