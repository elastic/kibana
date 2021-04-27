/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SortField,
  FlowTargetSourceDest,
  NetworkTopTablesFields,
  NetworkTopNFlowRequestOptions,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { getOppositeField } from '../helpers';
import { getQueryOrder } from './helpers';

// TODO: This is the same as the other one, so move this into helpers.
const getCountAgg = (flowTarget: FlowTargetSourceDest) => ({
  top_n_flow_count: {
    cardinality: {
      field: `${flowTarget}.ip`,
    },
  },
});

export const buildTopNFlowQueryEntities = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  sort,
  pagination: { querySize },
  timerange: { from, to },
  ip,
}: NetworkTopNFlowRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
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
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

const getFlowTargetAggs = (
  sort: SortField<NetworkTopTablesFields>,
  flowTarget: FlowTargetSourceDest,
  querySize: number
) => ({
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
          field: `metrics.${getOppositeField(flowTarget)}.bytes.sum`,
        },
      },
      bytes_out: {
        sum: {
          field: `metrics.${flowTarget}.bytes.sum`,
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
              _source: `${flowTarget}.geo.*`,
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
              _source: `${flowTarget}.as.*`,
              size: 1,
            },
          },
        },
      },
      flows: {
        avg: {
          // TODO: Should we use a max here along with a hybrid query?
          field: 'metrics.network.community_id.cardinality',
        },
      },
      [`${getOppositeField(flowTarget)}_ips`]: {
        avg: {
          // TODO: Should we use a max here along with a hybrid query?
          field: `metrics.${getOppositeField(flowTarget)}.ip.cardinality`,
        },
      },
    },
  },
});
