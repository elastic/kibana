/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
import { AgentsRequestOptions } from '../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../common/utils/build_query';

export const buildAgentsQuery = ({
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
}: AgentsRequestOptions): ISearchRequestParams => {
  const filter = [...createQueryFilterClauses(filterQuery)];

  const dslQuery = {
    allowNoIndices: true,
    index: '.fleet-agents',
    ignoreUnavailable: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      query: { bool: { filter } },
      track_total_hits: true,
    },
  };

  return dslQuery;
};
