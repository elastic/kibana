/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { SearchSummaryBucket } from '../../../../../common/log_search_summary';

const actionCreator = actionCreatorFactory('kibana/logging/log_search_summary');

/**
 * REPLACE_SEARCH_SUMMARY
 */

export interface ReplaceSearchSummaryPayload {
  query: string;
}

export interface ReplaceSearchSummaryResult {
  buckets: SearchSummaryBucket[];
}

export const replaceSearchSummary = actionCreator.async<
  ReplaceSearchSummaryPayload,
  ReplaceSearchSummaryResult
>('REPLACE_SEARCH_SUMMARY');
