/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsSortField, FlowDirection, FlowTarget } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';

import { DomainsRequestOptions } from './index';

// TODO: Extract as helper -- shared with query_top_n_flow
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
    default:
      return flowTarget;
  }
};

const getAggs = (
  ip: string,
  flowTarget: FlowTarget,
  flowDirection: FlowDirection,
  domainsSortField: DomainsSortField,
  limit: number
) => {
  return {
    domain_count: {
      cardinality: {
        field: `${getOppositeField(flowTarget)}.domain`,
      },
    },
    [`${flowTarget}_domains`]: {
      terms: {
        field: `${getOppositeField(flowTarget)}.domain`,
        size: limit + 1,
      },
      aggs: {
        firstSeen: {
          min: {
            field: '@timestamp',
          },
        },
        lastSeen: {
          max: {
            field: '@timestamp',
          },
        },
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
        uniqueIpCount: {
          cardinality: {
            field: `${flowTarget}.ip`,
          },
        },
        packets: {
          sum: {
            field: 'network.packets',
          },
        },
      },
    },
    all: {
      global: {},
      aggs: {
        all: {
          filter: {
            term: {
              [`${flowTarget}.ip`]: ip,
            },
          },
          aggs: {
            domains: {
              terms: {
                field: `${getOppositeField(flowTarget)}.domain`,
                size: limit + 1,
              },
              aggs: {
                firstSeen: {
                  min: {
                    field: '@timestamp',
                  },
                },
                lastSeen: {
                  max: {
                    field: '@timestamp',
                  },
                },
              },
            },
          },
        },
      },
    },
  };
};

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

export const buildDomainsQuery = ({
  ip,
  domainsSortField,
  filterQuery,
  flowDirection,
  flowTarget,
  pagination: { limit },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    packetbeatAlias,
  },
  timerange: { from, to },
}: DomainsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { range: { [timestamp]: { gte: from, lte: to } } },
    { term: { [`${getOppositeField(flowTarget)}.ip`]: ip } },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, packetbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggs: {
        ...getAggs(ip, flowTarget, flowDirection, domainsSortField, limit),
      },
      query: {
        bool: {
          filter,
          ...getUniDirectionalFilter(flowDirection),
          ...getBiDirectionalFilter(flowDirection, flowTarget),
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
