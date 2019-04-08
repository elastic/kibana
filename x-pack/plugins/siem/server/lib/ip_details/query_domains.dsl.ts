/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsSortField, FlowDirection, FlowTarget } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';

import { DomainsRequestOptions } from './index';

// TODO: Extract as helper -- shared with query_top_n_flow
const getOppositeField = (type: FlowTarget): FlowTarget => {
  switch (type) {
    case FlowTarget.source:
      return FlowTarget.destination;
    case FlowTarget.destination:
      return FlowTarget.source;
    case FlowTarget.server:
      return FlowTarget.client;
    case FlowTarget.client:
      return FlowTarget.server;
    default:
      return type;
  }
};

const getAggs = (
  ip: string,
  type: FlowTarget,
  flowDirection: FlowDirection,
  domainsSortField: DomainsSortField,
  limit: number
) => {
  return {
    [`${type}_domains`]: {
      terms: {
        field: `${getOppositeField(type)}.domain`,
        size: 20,
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
            field: `${type}.ip`,
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
              [`${type}.ip`]: ip,
            },
          },
          aggs: {
            domains: {
              terms: {
                field: `${getOppositeField(type)}.domain`,
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
          must_not: [
            {
              exists: {
                field: `${flowTarget}.bytes`,
              },
            },
          ],
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
