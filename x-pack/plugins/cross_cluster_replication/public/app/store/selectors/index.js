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

// Stats
export const getStatsState = (state) => state.stats;
export const getAutoFollowStats = createSelector(getStatsState, (statsState) => statsState.autoFollow);

// Auto-follow pattern
export const getAutoFollowPatternState = (state) => state.autoFollowPattern;
export const getAutoFollowPatterns = createSelector(getAutoFollowPatternState, (autoFollowPatternsState) => autoFollowPatternsState.byId);
export const getDetailPanelAutoFollowPatternName = createSelector(getAutoFollowPatternState,
  (autoFollowPatternsState) => autoFollowPatternsState.detailPanelId);
export const getSelectedAutoFollowPattern = createSelector(getAutoFollowPatternState, (autoFollowPatternsState) => {
  if(!autoFollowPatternsState.selectedId) {
    return null;
  }
  return autoFollowPatternsState.byId[autoFollowPatternsState.selectedId];
});
export const isAutoFollowPatternDetailPanelOpen = createSelector(getAutoFollowPatternState, (autoFollowPatternsState) => {
  return !!autoFollowPatternsState.detailPanelId;
});
export const getDetailPanelAutoFollowPattern = createSelector(
  getAutoFollowPatternState, getAutoFollowStats, (autoFollowPatternsState, autoFollowStatsState) => {
    if(!autoFollowPatternsState.detailPanelId) {
      return null;
    }
    const { detailPanelId } = autoFollowPatternsState;
    const autoFollowPattern = autoFollowPatternsState.byId[detailPanelId];
    const errors = autoFollowStatsState && autoFollowStatsState.recentAutoFollowErrors[detailPanelId] || [];
    return autoFollowPattern ? { ...autoFollowPattern, errors } : null;
  });
export const getListAutoFollowPatterns = createSelector(getAutoFollowPatterns, (autoFollowPatterns) =>  objectToArray(autoFollowPatterns));

