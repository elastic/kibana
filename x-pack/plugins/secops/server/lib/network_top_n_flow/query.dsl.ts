/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowType } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';
import { NetworkTopNFlowRequestOptions } from './index';

export const buildQuery = ({
  fields,
  filterQuery,
  networkTopNFlowType,
  timerange: { from, to },
  pagination: { limit },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
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

  const networkTopNFlowField =
    networkTopNFlowType === NetworkTopNFlowType.source ? 'source.ip' : 'destination.ip';

  const agg = {
    network_top_n_flow_count: {
      cardinality: {
        field: networkTopNFlowField,
      },
    },
  };

  const dslQuery = {
    allowNoIndices: true,
    index: logAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        network_top_n_flow: {
          terms: {
            field: networkTopNFlowField,
            size: limit + 1,
            order: {
              network_bytes: 'desc',
            },
          },
          aggs: {
            network_bytes: {
              sum: {
                field: 'network.bytes',
              },
            },
            source_domain: {
              terms: {
                field: 'source.domain',
                size: 1,
                order: {
                  network_bytes: 'desc',
                },
              },
              aggs: {
                network_bytes: {
                  sum: {
                    field: 'network.bytes',
                  },
                },
                network_packets: {
                  sum: {
                    field: 'network.packets',
                  },
                },
                event_duration: {
                  sum: {
                    field: 'event.duration',
                  },
                },
              },
            },
          },
        },
      },
      query: {
        bool: {
          must: [
            { exists: { field: 'source.domain' } },
            {
              match_phrase: {
                'event.action': {
                  query: 'netflow_flow',
                },
              },
            },
          ],
          filter,
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };

  return dslQuery;
};
