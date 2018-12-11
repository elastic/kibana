/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { objectToArray } from '../../services/utils';

// Api
export const getApiState = (state) => state.api;
export const getApiStatus = (scope) => createSelector(getApiState, (apiState) => apiState.status[scope]);
export const getApiError = (scope) => createSelector(getApiState, (apiState) => apiState.error[scope]);
export const isApiAuthorized = (scope) => createSelector(getApiError(scope), (error) => {
  if (!error) {
    return true;
  }
  return error.status !== 403;
});

// Auto-follow pattern
export const getAutoFollowPatternState = (state) => state.autoFollowPattern;
export const getAutoFollowPatterns = createSelector(getAutoFollowPatternState, (autoFollowPatternsState) => autoFollowPatternsState.byId);
export const getSelectedAutoFollowPattern = createSelector(getAutoFollowPatternState, (autoFollowPatternsState) => {
  if(!autoFollowPatternsState.selectedId) {
    return null;
  }
  return autoFollowPatternsState.byId[autoFollowPatternsState.selectedId];
});
export const getListAutoFollowPatterns = createSelector(getAutoFollowPatterns, (autoFollowPatterns) =>  objectToArray(autoFollowPatterns));
