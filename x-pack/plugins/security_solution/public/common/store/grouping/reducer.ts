/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { getDefaultGroupingOptions } from '../../../detections/components/alerts_table/grouping_settings';
import { updateGroups } from './actions';
import type { Groups } from './types';

const initialState: Groups = {};

export const groupsReducer = reducerWithInitialState(initialState).case(
  updateGroups,
  (state, { tableId, ...rest }) => ({
    ...state,
    [tableId]: {
      activeGroups: [],
      options: getDefaultGroupingOptions(tableId),
      ...(state[tableId] ? state[tableId] : {}),
      ...rest,
    },
  })
);
