/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State } from '../types';
import { ManageSourceGroupById, SourceGroupsType } from './model';

export const activeSourceGroupIdSelector = ({ sourcerer }: State): SourceGroupsType =>
  sourcerer.activeSourceGroupId;
export const availableIndexPatternsSelector = ({ sourcerer }: State): string[] =>
  sourcerer.availableIndexPatterns;
export const availableSourceGroupIdsSelector = ({ sourcerer }: State): SourceGroupsType[] =>
  sourcerer.availableSourceGroupIds;
export const isIndexPatternsLoadingSelector = ({ sourcerer }: State): boolean =>
  sourcerer.isIndexPatternsLoading;
export const sourceGroupsSelector = ({ sourcerer }: State): ManageSourceGroupById =>
  sourcerer.sourceGroups;
