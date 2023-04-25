/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { Filter, Query } from '@kbn/es-query';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from './search_utils';

const defaultSearchQuery = {
  match_all: {},
};

export interface AiOpsPageUrlState {
  pageKey: 'AIOPS_INDEX_VIEWER';
  pageUrlState: AiOpsIndexBasedAppState;
}

export interface AiOpsIndexBasedAppState {
  searchString?: Query['query'];
  searchQuery?: estypes.QueryDslQueryContainer;
  searchQueryLanguage: SearchQueryLanguage;
  filters?: Filter[];
}

export type AiOpsFullIndexBasedAppState = Required<AiOpsIndexBasedAppState>;

export const getDefaultAiOpsListState = (
  overrides?: Partial<AiOpsIndexBasedAppState>
): AiOpsFullIndexBasedAppState => ({
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  ...overrides,
});

export const isFullAiOpsListState = (arg: unknown): arg is AiOpsFullIndexBasedAppState => {
  return isPopulatedObject(arg, Object.keys(getDefaultAiOpsListState()));
};
