/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
import { AgentsRequestOptions } from '../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../common/utils/build_query';

export const buildAgentsQuery = ({
  filterQuery,
  pagination: { cursorStart, querySize },
  sort,
  aggregations,
}: AgentsRequestOptions): ISearchRequestParams => {
  const filter = [
    { term: { active: { value: 'true' } } },
    ...createQueryFilterClauses(filterQuery),
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: '.fleet-agents',
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      aggs: aggregations,
      track_total_hits: true,
      sort: [
        {
          [sort.field]: {
            order: sort.direction,
          },
        },
      ],
      size: querySize,
      from: cursorStart,
    },
  };

  return dslQuery;
};
