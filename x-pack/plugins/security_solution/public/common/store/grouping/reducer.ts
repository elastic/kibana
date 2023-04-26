/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { updateGroupSelector, updateSelectedGroup } from './actions';
import type { GroupModel } from './types';

export const initialGroupingState: GroupModel = {
  groupSelector: null,
  selectedGroup: null,
};

export const groupsReducer = reducerWithInitialState(initialGroupingState)
  .case(updateSelectedGroup, (state, { selectedGroup }) => ({
    ...state,
    selectedGroup,
  }))
  .case(updateGroupSelector, (state, { groupSelector }) => ({
    ...state,
    groupSelector,
  }));
