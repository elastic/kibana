/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { KueryFilterQuery, SerializedFilterQuery } from '../../store';

interface GetFilterComponentParams {
  applyFilterQuery: (filterQuery: SerializedFilterQuery) => void;
  filterQueryDraft: KueryFilterQuery;
  indexPattern: StaticIndexPattern;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraft: (filterQueryDraft: KueryFilterQuery) => void;
}

interface FilterComponentArgs {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraftFromKueryExpression: (expression: string) => void;
}

export const getFilterComponent = ({
  applyFilterQuery,
  filterQueryDraft,
  indexPattern,
  isFilterQueryDraftValid,
  setFilterQueryDraft,
}: GetFilterComponentParams): FilterComponentArgs => ({
  applyFilterQueryFromKueryExpression: (expression: string) =>
    applyFilterQuery({
      query: {
        kind: 'kuery',
        expression,
      },
      serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
    }),
  filterQueryDraft,
  isFilterQueryDraftValid,
  setFilterQueryDraftFromKueryExpression: (expression: string) =>
    setFilterQueryDraft({
      kind: 'kuery',
      expression,
    }),
});
