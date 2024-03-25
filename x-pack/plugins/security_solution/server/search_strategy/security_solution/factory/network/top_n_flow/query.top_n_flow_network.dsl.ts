/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsTopHitsAggregation,
} from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import type {
  NetworkTopNFlowCountRequestOptions,
  NetworkTopNFlowOldRequestOptions,
  NetworkTopNFlowRequestOptions,
} from '../../../../../../common/api/search_strategy';
import type { FlowTargetSourceDest } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { getOppositeField } from '../helpers';
import { getQueryOrder } from './helpers';

export const buildTopNFlowOldQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  sort,
  pagination,
  timerange: { from, to },
  ip,
}: NetworkTopNFlowOldRequestOptions): ISearchRequestParams => {
  const querySize = pagination?.querySize ?? 10;

  const filter = [...createQueryFilterClauses(filterQuery), getTimeRangeFilter(from, to)];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(flowTarget),
        ...getFlowTargetAggs(sort, flowTarget, querySize),
      },
      query: {
        bool: ip
          ? {
              filter,
              should: [
                {
                  term: {
                    [`${getOppositeField(flowTarget)}.ip`]: ip,
                  },
                },
              ],
              minimum_should_match: 1,
            }
          : {
              filter,
            },
      },
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

export const buildTopNFlowQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  sort,
  pagination,
  timerange: { from, to },
  ip,
}: NetworkTopNFlowRequestOptions): ISearchRequestParams => {
  const querySize = pagination?.querySize ?? 10;

  const filter = [...createQueryFilterClauses(filterQuery), getTimeRangeFilter(from, to)];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: getFlowTargetAggs(sort, flowTarget, querySize),
      query: {
        bool: ip
          ? {
              filter,
              should: [
                {
                  term: {
                    [`${getOppositeField(flowTarget)}.ip`]: ip,
                  },
                },
              ],
              minimum_should_match: 1,
            }
          : {
              filter,
            },
      },
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
  timerange: { from, to },
  ip,
}: NetworkTopNFlowCountRequestOptions): ISearchRequestParams => {
  const filter = [...createQueryFilterClauses(filterQuery), getTimeRangeFilter(from, to)];
  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(flowTarget),
      },
      query: {
        bool: ip
          ? {
              filter,
              should: [
                {
                  term: {
                    [`${getOppositeField(flowTarget)}.ip`]: ip,
                  },
                },
              ],
              minimum_should_match: 1,
            }
          : {
              filter,
            },
      },
      _source: false,
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

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
): Record<string, AggregationsAggregationContainer> => ({
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
            } as AggregationsTopHitsAggregation,
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
            } as AggregationsTopHitsAggregation,
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
