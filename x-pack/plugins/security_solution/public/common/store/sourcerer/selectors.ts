/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { State } from '../types';
import { ManageSourceGroupById, SourceGroupsType } from './model';

// const getActiveSourceGroupId = (state: State): SourceGroupsType =>
//   state.sourcerer.activeSourceGroupId;
// const getAvailableIndexPatterns = (state: State): string[] =>
//   state.sourcerer.availableIndexPatterns;
// const getAvailableSourceGroupIds = (state: State): SourceGroupsType[] =>
//   state.sourcerer.availableSourceGroupIds;
// const getIsIndexPatternsLoading = (state: State): boolean => state.sourcerer.isIndexPatternsLoading;
// const getSourceGroups = (state: State): ManageSourceGroupById => state.sourcerer.sourceGroups;
// const getSourceGroupById = (
//   state: State,
//   id: SourceGroupsType
// ): ManageSourceGroupById | undefined => state.sourcerer.sourceGroups[id];

export const activeSourceGroupIdSelector = (state: State): SourceGroupsType =>
  state.sourcerer.activeSourceGroupId;
export const availableIndexPatternsSelector = (state: State): string[] =>
  state.sourcerer.availableIndexPatterns;
export const availableSourceGroupIdsSelector = (state: State): SourceGroupsType[] =>
  state.sourcerer.availableSourceGroupIds;
export const isIndexPatternsLoadingSelector = (state: State): boolean =>
  state.sourcerer.isIndexPatternsLoading;
export const sourceGroupsSelector = (state: State): ManageSourceGroupById =>
  state.sourcerer.sourceGroups;

// export const activeSourceGroupIdSelector = () =>
//   createSelector(getActiveSourceGroupId, (activeSourceGroupId) => activeSourceGroupId);
// export const availableIndexPatternsSelector = () =>
//   createSelector(getAvailableIndexPatterns, (availableIndexPatterns) => availableIndexPatterns);
// export const availableSourceGroupIdsSelector = () =>
//   createSelector(getAvailableSourceGroupIds, (availableSourceGroupIds) => availableSourceGroupIds);
// export const isIndexPatternsLoadingSelector = () =>
//   createSelector(getIsIndexPatternsLoading, (isIndexPatternsLoading) => isIndexPatternsLoading);
// export const sourceGroupsSelector = () =>
//   createSelector(getSourceGroups, (sourceGroups) => sourceGroups);
// export const sourceGroupByIdSelector = () =>
//   createSelector(getSourceGroupById, (sourceGroupById) => sourceGroupById);
