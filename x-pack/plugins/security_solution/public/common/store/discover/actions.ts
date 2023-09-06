/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { SecuritySolutionDiscoverState } from './model';

const actionCreator = actionCreatorFactory('x-pack/security_solution/discover');

export const updateDiscoverAppState = actionCreator<{
  newState: SecuritySolutionDiscoverState['app'];
}>('UPDATE_DISCOVER_APP_STATE');

export const updateDiscoverInternalState = actionCreator<{
  newState: SecuritySolutionDiscoverState['internal'];
}>('UPDATE_DISCOVER_INTERNAL_STATE');

export const updateDiscoverSavedSearchState = actionCreator<{
  newState: SecuritySolutionDiscoverState['savedSearch'];
}>('UPDATE_DISCOVER_SAVED_SEARCH_STATE');
