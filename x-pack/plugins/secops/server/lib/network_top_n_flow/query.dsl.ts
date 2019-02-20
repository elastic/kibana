/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowDirection, NetworkTopNFlowType } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';
import { NetworkTopNFlowRequestOptions } from './index';

const getUniDirectionalFilter = (networkTopNFlowDirection: NetworkTopNFlowDirection) =>
  networkTopNFlowDirection === NetworkTopNFlowDirection.uniDirectional
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

const getBiDirectionalFilter = (
  networkTopNFlowDirection: NetworkTopNFlowDirection,
  networkTopNFlowType: NetworkTopNFlowType
) => {
  if (
    networkTopNFlowDirection === NetworkTopNFlowDirection.biDirectional &&
    [NetworkTopNFlowType.source, NetworkTopNFlowType.destination].includes(networkTopNFlowType)
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
    networkTopNFlowDirection === NetworkTopNFlowDirection.biDirectional &&
    [NetworkTopNFlowType.client, NetworkTopNFlowType.server].includes(networkTopNFlowType)
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

const getCountAgg = (networkTopNFlowType: NetworkTopNFlowType) => ({
  top_n_flow_count: {
    cardinality: {
      field: `${networkTopNFlowType}.ip`,
    },
  },
});

export const buildQuery = ({
  fields,
  filterQuery,
  networkTopNFlowDirection,
  networkTopNFlowType,
  timerange: { from, to },
  pagination: { limit },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    packetbeatAlias,
  },
}: NetworkTopNFlowRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, packetbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(networkTopNFlowType),
        ...getUniDirectionAggs(networkTopNFlowDirection, networkTopNFlowType, limit),
        ...getBiDirectionAggs(networkTopNFlowDirection, networkTopNFlowType, limit),
      },
      query: {
        bool: {
          filter,
          ...getUniDirectionalFilter(networkTopNFlowDirection),
          ...getBiDirectionalFilter(networkTopNFlowDirection, networkTopNFlowType),
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

const getUniDirectionAggs = (
  networkTopNFlowDirection: NetworkTopNFlowDirection,
  networkTopNFlowType: NetworkTopNFlowType,
  limit: number
) =>
  networkTopNFlowDirection === NetworkTopNFlowDirection.uniDirectional
    ? {
        top_uni_flow: {
          terms: {
            field: `${networkTopNFlowType}.ip`,
            size: limit + 1,
            order: {
              bytes: 'desc',
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
                field: `${networkTopNFlowType}.domain`,
                order: {
                  timestamp: 'desc',
                },
              },
              aggs: {
                timestamp: {
                  sum: {
                    field: '@timestamp',
                  },
                },
              },
            },
            ip_count: {
              cardinality: {
                field: `${
                  networkTopNFlowType === NetworkTopNFlowType.source
                    ? NetworkTopNFlowType.destination
                    : NetworkTopNFlowType.source
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
  networkTopNFlowDirection: NetworkTopNFlowDirection,
  networkTopNFlowType: NetworkTopNFlowType,
  limit: number
) =>
  networkTopNFlowDirection === NetworkTopNFlowDirection.biDirectional
    ? {
        top_bi_flow: {
          terms: {
            field: `${networkTopNFlowType}.ip`,
            size: limit + 1,
            order: {
              bytes: 'desc',
            },
          },
          aggs: {
            bytes: {
              sum: {
                field: `${networkTopNFlowType}.bytes`,
              },
            },
            direction: {
              terms: {
                field: 'network.direction',
              },
            },
            domain: {
              terms: {
                field: `${networkTopNFlowType}.domain`,
                order: {
                  timestamp: 'desc',
                },
              },
              aggs: {
                timestamp: {
                  sum: {
                    field: '@timestamp',
                  },
                },
              },
            },
            ip_count: {
              cardinality: {
                field: `${getOppositeField(networkTopNFlowType)}.ip`,
              },
            },
            packets: {
              sum: {
                field: `${networkTopNFlowType}.packets`,
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

const getOppositeField = (networkTopNFlowType: NetworkTopNFlowType) => {
  if (networkTopNFlowType === NetworkTopNFlowType.source) {
    return NetworkTopNFlowType.destination;
  } else if (networkTopNFlowType === NetworkTopNFlowType.destination) {
    return NetworkTopNFlowType.source;
  } else if (networkTopNFlowType === NetworkTopNFlowType.client) {
    return NetworkTopNFlowType.server;
  } else if (networkTopNFlowType === NetworkTopNFlowType.server) {
    return NetworkTopNFlowType.client;
  }
};
