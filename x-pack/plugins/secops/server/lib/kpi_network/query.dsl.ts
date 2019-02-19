/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

const getKpiNetworkFilter = () => [
  {
    bool: {
      filter: [
        {
          bool: {
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  },
];

export const buildQuery = ({
  filterQuery,
  timerange: { from, to },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    packetbeatAlias,
  },
}: RequestBasicOptions) => {

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...getKpiNetworkFilter(),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ]

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, packetbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        unique_flow_id: {
          cardinality: {
            field: 'network.community_id',
          },
        },
        active_agents: {
          cardinality: {
            field: 'agent.id',
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true
    },
  };

  return dslQuery;
};
