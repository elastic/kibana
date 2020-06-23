/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopTablesSortField,
  NetworkTopTablesFields,
} from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopNFlowRequestOptions } from './index';

const getCountAgg = (flowTarget: FlowTargetSourceDest) => ({
  top_n_flow_count: {
    cardinality: {
      field: `${flowTarget}.ip`,
    },
  },
});

export const buildTopNFlowQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  networkTopNFlowSort,
  pagination: { querySize },
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
  ip,
}: NetworkTopNFlowRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { range: { [timestamp]: { gte: from, lte: to } } },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(flowTarget),
        ...getFlowTargetAggs(networkTopNFlowSort, flowTarget, querySize),
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
  networkTopNFlowSortField: NetworkTopTablesSortField,
  flowTarget: FlowTargetSourceDest,
  querySize: number
) => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.ip`,
      size: querySize,
      order: {
        ...getQueryOrder(networkTopNFlowSortField),
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

export const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest => {
  switch (flowTarget) {
    case FlowTargetSourceDest.source:
      return FlowTargetSourceDest.destination;
    case FlowTargetSourceDest.destination:
      return FlowTargetSourceDest.source;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

const getQueryOrder = (networkTopNFlowSortField: NetworkTopTablesSortField): QueryOrder => {
  switch (networkTopNFlowSortField.field) {
    case NetworkTopTablesFields.bytes_in:
      return { bytes_in: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.bytes_out:
      return { bytes_out: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.flows:
      return { flows: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.destination_ips:
      return { destination_ips: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.source_ips:
      return { source_ips: networkTopNFlowSortField.direction };
  }
  assertUnreachable(networkTopNFlowSortField.field);
};
