/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchRequestParams } from '@kbn/data-plugin/common';
import { OSQUERY_INTEGRATION_NAME } from '../../../../../common';
import { ResultsRequestOptions } from '../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../common/utils/build_query';

export const buildResultsQuery = ({
  actionId,
  agentId,
  filterQuery,
  sort,
  pagination: { activePage, querySize },
}: ResultsRequestOptions): ISearchRequestParams => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      match_phrase: {
        action_id: actionId,
      },
    },
    ...(agentId
      ? [
          {
            match_phrase: {
              'agent.id': agentId,
            },
          },
        ]
      : []),
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
    ignore_unavailable: true,
    body: {
      aggs: {
        count_by_agent_id: {
          terms: {
            field: 'elastic_agent.id',
            size: 10000,
          },
        },
        unique_agents: {
          cardinality: {
            field: 'elastic_agent.id',
          },
        },
      },
      query: { bool: { filter } },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
      sort:
        sort?.map((sortConfig) => ({
          [sortConfig.field]: {
            order: sortConfig.direction,
          },
        })) ?? [],
    },
  };

  return dslQuery;
};
