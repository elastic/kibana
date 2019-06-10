/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowDirection,
  FlowTarget,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopNFlowRequestOptions } from './index';

const getUniDirectionalFilter = (flowDirection: FlowDirection) =>
  flowDirection === FlowDirection.uniDirectional
    ? {
        must_not: [
          {
            exists: {
              field: 'destination.bytes',
            },
          },
        ],
      }
    : {};

const getBiDirectionalFilter = (flowDirection: FlowDirection, flowTarget: FlowTarget) => {
  if (
    flowDirection === FlowDirection.biDirectional &&
    [FlowTarget.source, FlowTarget.destination].includes(flowTarget)
  ) {
    return {
      must: [
        {
          exists: {
            field: 'source.bytes',
          },
        },
        {
          exists: {
            field: 'destination.bytes',
          },
        },
      ],
    };
  } else if (
    flowDirection === FlowDirection.biDirectional &&
    [FlowTarget.client, FlowTarget.server].includes(flowTarget)
  ) {
    return {
      must: [
        {
          exists: {
            field: 'client.bytes',
          },
        },
        {
          exists: {
            field: 'server.bytes',
          },
        },
      ],
    };
  }
  return [];
};

const getCountAgg = (flowTarget: FlowTarget) => ({
  top_n_flow_count: {
    cardinality: {
      field: `${flowTarget}.ip`,
    },
  },
});

export const buildTopNFlowQuery = ({
  fields,
  filterQuery,
  flowDirection,
  networkTopNFlowSort,
  flowTarget,
  timerange: { from, to },
  pagination: { limit },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
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
        ...getUniDirectionAggs(flowDirection, networkTopNFlowSort, flowTarget, limit),
        ...getBiDirectionAggs(flowDirection, networkTopNFlowSort, flowTarget, limit),
      },
      query: {
        bool: {
          filter,
          ...getUniDirectionalFilter(flowDirection),
          ...getBiDirectionalFilter(flowDirection, flowTarget),
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

const getUniDirectionAggs = (
  flowDirection: FlowDirection,
  networkTopNFlowSortField: NetworkTopNFlowSortField,
  flowTarget: FlowTarget,
  limit: number
) =>
  flowDirection === FlowDirection.uniDirectional
    ? {
        top_uni_flow: {
          terms: {
            field: `${flowTarget}.ip`,
            size: limit + 1,
            order: {
              ...getQueryOrder(networkTopNFlowSortField),
            },
          },
          aggs: {
            bytes: {
              sum: {
                field: 'network.bytes',
              },
            },
            direction: {
              terms: {
                field: 'network.direction',
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
            ip_count: {
              cardinality: {
                field: `${
                  flowTarget === FlowTarget.source ? FlowTarget.destination : FlowTarget.source
                }.ip`,
              },
            },
            packets: {
              sum: {
                field: 'network.packets',
              },
            },
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
      }
    : {};

const getBiDirectionAggs = (
  flowDirection: FlowDirection,
  networkTopNFlowSortField: NetworkTopNFlowSortField,
  flowTarget: FlowTarget,
  limit: number
) =>
  flowDirection === FlowDirection.biDirectional
    ? {
        top_bi_flow: {
          terms: {
            field: `${flowTarget}.ip`,
            size: limit + 1,
            order: {
              ...getQueryOrder(networkTopNFlowSortField),
            },
          },
          aggs: {
            bytes: {
              sum: {
                field: `${flowTarget}.bytes`,
              },
            },
            direction: {
              terms: {
                field: 'network.direction',
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
            ip_count: {
              cardinality: {
                field: `${getOppositeField(flowTarget)}.ip`,
              },
            },
            packets: {
              sum: {
                field: `${flowTarget}.packets`,
              },
            },
            timestamp: {
              max: {
                field: '@timestamp',
              },
            },
          },
        },
      }
    : {};

const getOppositeField = (flowTarget: FlowTarget): FlowTarget => {
  switch (flowTarget) {
    case FlowTarget.source:
      return FlowTarget.destination;
    case FlowTarget.destination:
      return FlowTarget.source;
    case FlowTarget.server:
      return FlowTarget.client;
    case FlowTarget.client:
      return FlowTarget.server;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder = { bytes: Direction } | { packets: Direction } | { ip_count: Direction };

const getQueryOrder = (networkTopNFlowSortField: NetworkTopNFlowSortField): QueryOrder => {
  switch (networkTopNFlowSortField.field) {
    case NetworkTopNFlowFields.bytes:
      return { bytes: networkTopNFlowSortField.direction };
    case NetworkTopNFlowFields.packets:
      return { packets: networkTopNFlowSortField.direction };
    case NetworkTopNFlowFields.ipCount:
      return { ip_count: networkTopNFlowSortField.direction };
  }
  assertUnreachable(networkTopNFlowSortField.field);
};
