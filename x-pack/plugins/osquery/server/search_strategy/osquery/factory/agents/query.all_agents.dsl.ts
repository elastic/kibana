/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
import { AgentsRequestOptions } from '../../../../../common/search_strategy';
// import { createQueryFilterClauses } from '../../../../../common/utils/build_query';

export const buildAgentsQuery = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filterQuery,
  pagination: { cursorStart, querySize },
  sort,
}: AgentsRequestOptions): ISearchRequestParams => {
  // const filter = [...createQueryFilterClauses(filterQuery)];

  const dslQuery = {
    allowNoIndices: true,
    index: '.fleet-agents',
    ignoreUnavailable: true,
    body: {
      query: {
        term: {
          active: {
            value: 'true',
          },
        },
      },
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
