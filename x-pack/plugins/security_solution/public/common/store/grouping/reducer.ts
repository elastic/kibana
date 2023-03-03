/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import {
  initGrouping,
  updateActiveGroup,
  updateGroupActivePage,
  updateGroupItemsPerPage,
  updateGroupOptions,
} from './actions';
import { EMPTY_GROUP_BY_ID } from './constants';
import { defaultGroup } from './defaults';
import type { GroupMap } from './types';

const initialGroupState: GroupMap = {
  groupById: EMPTY_GROUP_BY_ID,
};

export const groupsReducer = reducerWithInitialState(initialGroupState)
  .case(updateActiveGroup, (state, { id, activeGroup }) => ({
    ...state,
    groupById: {
      ...state.groupById,
      [id]: {
        ...state.groupById[id],
        activeGroup,
      },
    },
  }))
  .case(updateGroupActivePage, (state, { id, activePage }) => ({
    ...state,
    groupById: {
      ...state.groupById,
      [id]: {
        ...state.groupById[id],
        activePage,
      },
    },
  }))

  .case(updateGroupItemsPerPage, (state, { id, itemsPerPage }) => ({
    ...state,
    groupById: {
      ...state.groupById,
      [id]: {
        ...state.groupById[id],
        itemsPerPage,
      },
    },
  }))
  .case(updateGroupOptions, (state, { id, newOptionList }) => ({
    ...state,
    groupById: {
      ...state.groupById,
      [id]: {
        ...state.groupById[id],
        options: newOptionList,
      },
    },
  }))
  .case(initGrouping, (state, { id }) => ({
    ...state,
    groupById: {
      ...state.groupById,
      [id]: {
        ...defaultGroup,
        ...state.groupById[id],
      },
    },
  }));
