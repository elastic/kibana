/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_INTEGRATION_NAME } from '../../../../../common';
import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
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
    allowNoIndices: true,
    index: `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
    ignoreUnavailable: true,
    body: {
      aggs: {
        count_by_agent_id: {
          terms: {
            field: 'elastic_agent.id',
            size: 10000,
          },
        },
      },
      query: { bool: { filter } },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      fields: agentId ? ['osquery.*'] : ['agent.*', 'osquery.*'],
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
