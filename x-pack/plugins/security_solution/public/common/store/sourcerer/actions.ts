/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { ManageSourceInit, SourceGroupsType } from './model';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/sourcerer');

export const setSource = actionCreator<{
  id: SourceGroupsType;
  payload: ManageSourceInit;
}>('SET_SOURCE');

export const setIsSourceLoading = actionCreator<{ id: SourceGroupsType; payload: boolean }>(
  'SET_IS_SOURCE_LOADING'
);

export const setActiveSourceGroupId = actionCreator<{ payload: SourceGroupsType }>(
  'SET_ACTIVE_SOURCE_GROUP_ID'
);

export const setKibanaIndexPatterns = actionCreator<{ payload: string[] }>(
  'SET_KIBANA_INDEX_PATTERNS'
);

export const setIsIndexPatternsLoading = actionCreator<{ payload: boolean }>(
  'SET_IS_INDEX_PATTERNS_LOADING'
);
