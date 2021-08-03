/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { AgentsRequestOptions } from '../../../../../../common/search_strategy';
// import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionsQuery = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filterQuery,
  sort,
  pagination: { cursorStart, querySize },
}: AgentsRequestOptions): ISearchRequestParams => {
  // const filter = [...createQueryFilterClauses(filterQuery)];

  const dslQuery = {
    allowNoIndices: true,
    index: '.fleet-actions',
    ignoreUnavailable: true,
    body: {
      // query: { bool: { filter } },
      query: {
        bool: {
          must: [
            {
              term: {
                type: {
                  value: 'INPUT_ACTION',
                },
              },
            },
            {
              term: {
                input_type: {
                  value: 'osquery',
                },
              },
            },
          ] as estypes.QueryDslQueryContainer[],
        },
      },
      from: cursorStart,
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
