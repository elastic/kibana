/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { ActionResultsRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionResultsQuery = ({
  actionId,
  filterQuery,
  sort,
  pagination: { activePage, querySize },
}: ActionResultsRequestOptions): ISearchRequestParams => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      match_phrase: {
        action_id: actionId,
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: '.fleet-actions-results*',
    ignoreUnavailable: true,
    body: {
      aggs: {
        responses: {
          terms: {
            script: {
              lang: 'painless',
              source: "if (doc['error'].size()==0) { return 'success' } else { return 'error' }",
            },
          },
        },
      },
      query: { bool: { filter } },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      fields: ['*'],
      sort: [
        {
          [sort.field]: {
            order: sort.direction,
          },
        },
      ],
    },
  };

  return dslQuery;
};
