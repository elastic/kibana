/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
import { ResultsRequestOptions } from '../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../common/utils/build_query';

export const buildResultsQuery = ({
  actionId,
  agentId,
  filterQuery,
  pagination: { activePage, querySize },
  sort,
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
    index: 'logs-elastic_agent.osquery*',
    ignoreUnavailable: true,
    body: {
      query: { bool: { filter } },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      fields: agentId ? ['osquery.*'] : ['agent.*', 'osquery.*'],
    },
  };

  return dslQuery;
};
