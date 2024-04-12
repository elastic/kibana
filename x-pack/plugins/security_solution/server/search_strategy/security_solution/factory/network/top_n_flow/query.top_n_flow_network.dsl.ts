/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsTopHitsAggregation,
  Field,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import type {
  NetworkTopNFlowCountRequestOptions,
  NetworkTopNFlowRequestOptions,
} from '../../../../../../common/api/search_strategy';
import type { FlowTargetSourceDest } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { getOppositeField } from '../helpers';
import { getQueryOrder } from './helpers';

interface AggregationsAggregationWithFieldsContainer extends AggregationsAggregationContainer {
  aggregations?: Record<string, AggregationsAggregationWithFieldsContainer>;
  aggs?: Record<string, AggregationsAggregationWithFieldsContainer>;
  top_hits?: AggregationsTopHitsAggregation & {
    fields?: Array<QueryDslFieldAndFormat | Field>; // fields is missing in the official types but it is used in the query
  };
}

export const buildTopNFlowQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  sort,
  pagination,
  timerange,
  ip,
}: NetworkTopNFlowRequestOptions): ISearchRequestParams => {
  const querySize = pagination?.querySize ?? 10;
  const query = getQuery({ filterQuery, flowTarget, timerange, ip });

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: getFlowTargetAggs(sort, flowTarget, querySize),
      query,
      _source: false,
      fields: [
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

export const buildTopNFlowCountQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  timerange,
  ip,
}: NetworkTopNFlowCountRequestOptions): ISearchRequestParams => {
  const query = getQuery({ filterQuery, flowTarget, timerange, ip });
  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: { aggregations: getCountAgg(flowTarget), query, _source: false },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

// creates the dsl bool query with the filters
const getQuery = ({
  filterQuery,
  flowTarget,
  timerange: { from, to },
  ip,
}: Pick<
  NetworkTopNFlowRequestOptions,
  'filterQuery' | 'flowTarget' | 'timerange' | 'ip'
>): QueryDslQueryContainer => ({
  bool: {
    filter: [...createQueryFilterClauses(filterQuery), getTimeRangeFilter(from, to)],
    ...(ip && {
      should: [{ term: { [`${getOppositeField(flowTarget)}.ip`]: ip } }],
      minimum_should_match: 1,
    }),
  },
});

const getTimeRangeFilter = (from: string, to: string) => ({
  range: {
    '@timestamp': { gte: from, lte: to, format: 'strict_date_optional_time' },
  },
});

const getCountAgg = (
  flowTarget: FlowTargetSourceDest
): Record<string, AggregationsAggregationContainer> => ({
  top_n_flow_count: { cardinality: { field: `${flowTarget}.ip` } },
});

const getFlowTargetAggs = (
  sort: NetworkTopNFlowRequestOptions['sort'],
  flowTarget: FlowTargetSourceDest,
  querySize: number
): Record<string, AggregationsAggregationWithFieldsContainer> => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.ip`,
      size: querySize,
      order: {
        ...getQueryOrder(sort),
      },
    },
    aggs: {
      bytes_in: {
        sum: {
          field: `${getOppositeField(flowTarget)}.bytes`,
        },
      },
      bytes_out: {
        sum: {
          field: `${flowTarget}.bytes`,
        },
      },
      domain: {
        terms: {
          field: `${flowTarget}.domain`,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      location: {
        filter: {
          exists: {
            field: `${flowTarget}.geo`,
          },
        },
        aggs: {
          top_geo: {
            top_hits: {
              _source: false,
              fields: [
                `${flowTarget}.geo.*`,
                {
                  field: '@timestamp',
                  format: 'strict_date_optional_time',
                },
              ],
              size: 1,
            },
          },
        },
      },
      autonomous_system: {
        filter: {
          exists: {
            field: `${flowTarget}.as`,
          },
        },
        aggs: {
          top_as: {
            top_hits: {
              _source: false,
              fields: [
                `${flowTarget}.as.*`,
                {
                  field: '@timestamp',
                  format: 'strict_date_optional_time',
                },
              ],
              size: 1,
            },
          },
        },
      },
      flows: {
        cardinality: {
          field: 'network.community_id',
        },
      },
      [`${getOppositeField(flowTarget)}_ips`]: {
        cardinality: {
          field: `${getOppositeField(flowTarget)}.ip`,
        },
      },
    },
  },
});
