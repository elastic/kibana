/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics } from 'redux-observable';

import { entriesEpics } from './entries';
import { searchResultsEpics } from './search_results';
import { searchSummaryEpics } from './search_summary';
import { summaryEpics } from './summary';

export const createRootEpic = <State>() =>
  combineEpics(
    summaryEpics.createSummaryEpic<State>(),
    entriesEpics.createSummaryEpic<State>(),
    searchResultsEpics.createSearchResultsEpic<State>(),
    searchSummaryEpics.createSearchSummaryEpic<State>()
  );
