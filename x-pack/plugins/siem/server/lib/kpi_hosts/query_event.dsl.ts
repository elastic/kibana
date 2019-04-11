/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { EventModuleAttributeQuery, KpiHostsESMSearchBody } from './types';

const getAgentTypeFilter = ({ agentType }: EventModuleAttributeQuery) =>
  agentType
    ? [
        {
          bool: {
            should: [
              {
                match_phrase: {
                  'agent.type': agentType,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [];

const getEventModuleFilter = ({ eventModule }: EventModuleAttributeQuery) =>
  eventModule
    ? [
        {
          bool: {
            should: [
              {
                match_phrase: {
                  'event.module': eventModule,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [];

const getEventQueryFilter = (attrQuery: EventModuleAttributeQuery) => [
  ...getAgentTypeFilter(attrQuery),
  ...getEventModuleFilter(attrQuery),
];
export const buildEventQuery = (
  attrQuery: EventModuleAttributeQuery,
  {
    filterQuery,
    timerange: { from, to },
    sourceConfiguration: {
      fields: { timestamp },
      logAlias,
      auditbeatAlias,
      packetbeatAlias,
      winlogbeatAlias,
    },
  }: RequestBasicOptions
): KpiHostsESMSearchBody[] => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...getEventQueryFilter(attrQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = [
    {
      index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
      allowNoIndices: true,
      ignoreUnavailable: true,
    },
    {
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  ];

  return dslQuery;
};
