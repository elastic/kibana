/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableReducer } from '../../../../common/store';
import { Immutable } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';

import { EventFilterCreateStart, EventFilterInitForm } from './action';

import { EventFiltersListPageState } from '../state';
import { initialEventFiltersPageState } from './builders';

type StateReducer = ImmutableReducer<EventFiltersListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EventFiltersListPageState>,
  action: Immutable<T>
) => Immutable<EventFiltersListPageState>;

const eventFilterCreateStart: CaseReducer<EventFilterCreateStart> = (state, action) => {
  return { ...state };
};

const eventFilterInitForm: CaseReducer<EventFilterInitForm> = (state, action) => {
  return { ...state, form: { ...state.form, entry: action.payload.entry } };
};

export const eventFiltersPageReducer: StateReducer = (
  state = initialEventFiltersPageState(),
  action
) => {
  switch (action.type) {
    case 'eventFilterCreateStart':
      return eventFilterCreateStart(state, action);
    case 'eventFilterInitForm':
      return eventFilterInitForm(state, action);
  }

  return state;
};
