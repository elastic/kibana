/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { ActionDetailsRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionDetailsQuery = ({
  actionId,
  docValueFields,
  filterQuery,
}: ActionDetailsRequestOptions): ISearchRequestParams => {
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
    index: '.fleet-actions',
    ignoreUnavailable: true,
    body: {
      query: { bool: { filter } },
      size: 1,
      fields: ['*'],
    },
  };

  return dslQuery;
};
