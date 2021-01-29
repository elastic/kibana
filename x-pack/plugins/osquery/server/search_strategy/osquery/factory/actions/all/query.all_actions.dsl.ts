/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { AgentsRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionsQuery = ({
  docValueFields,
  filterQuery,
  pagination: { activePage, querySize },
  sort,
}: AgentsRequestOptions): ISearchRequestParams => {
  const filter = [...createQueryFilterClauses(filterQuery)];

  const dslQuery = {
    allowNoIndices: true,
    index: '.fleet-actions',
    ignoreUnavailable: true,
    body: {
      query: { bool: { filter } },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      fields: ['*'],
    },
  };

  return dslQuery;
};
