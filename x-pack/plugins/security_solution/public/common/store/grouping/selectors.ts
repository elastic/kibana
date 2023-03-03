/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { GroupModel, GroupsById, GroupState } from './types';

const selectGroupByEntityId = (state: GroupState): GroupsById => state.groups.groupById;

export const groupByIdSelector = createSelector(
  selectGroupByEntityId,
  (groupsByEntityId) => groupsByEntityId
);

export const selectGroup = (state: GroupState, entityId: string): GroupModel =>
  state.groups.groupById[entityId];

export const getGroupByIdSelector = () => createSelector(selectGroup, (group) => group);
