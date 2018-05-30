/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { SearchResult } from '../../../../../common/log_search_result';

const actionCreator = actionCreatorFactory('kibana/logging/search_results');

/**
 * REPLACE_SEARCH_RESULTS
 */

export interface ReplaceSearchResultsPayload {
  query: string;
}

export interface ReplaceSearchResultsResult {
  results: SearchResult[];
}

export const replaceSearchResults = actionCreator.async<
  ReplaceSearchResultsPayload,
  ReplaceSearchResultsResult
>('REPLACE_SEARCH_RESULTS');

/**
 * REPLACE_OLDER_SEARCH_RESULTS
 */

export interface ReplaceOlderSearchResultsPayload {
  query: string;
}

export interface ReplaceOlderSearchResultsResult {
  results: SearchResult[];
}

export const replaceOlderSearchResults = actionCreator.async<
  ReplaceOlderSearchResultsPayload,
  ReplaceOlderSearchResultsResult
>('REPLACE_OLDER_SEARCH_RESULTS');

/**
 * REPLACE_NEWER_SEARCH_RESULTS
 */

export interface ReplaceNewerSearchResultsPayload {
  query: string;
}

export interface ReplaceNewerSearchResultsResult {
  results: SearchResult[];
}

export const replaceNewerSearchResults = actionCreator.async<
  ReplaceNewerSearchResultsPayload,
  ReplaceNewerSearchResultsResult
>('REPLACE_NEWER_SEARCH_RESULTS');
