/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableReducer } from '../../../../common/store';
import { Immutable } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';

import {
  EventFilterInitForm,
  EventFilterChangeForm,
  EventFilterCreateStart,
  EventFilterCreateSuccess,
  EventFilterCreateError,
} from './action';

import { EventFiltersListPageState } from '../state';
import { initialEventFiltersPageState } from './builders';

type StateReducer = ImmutableReducer<EventFiltersListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EventFiltersListPageState>,
  action: Immutable<T>
) => Immutable<EventFiltersListPageState>;

const eventFilterInitForm: CaseReducer<EventFilterInitForm> = (state, action) => {
  return { ...state, form: { ...state.form, entry: action.payload.entry } };
};

const eventFilterChangeForm: CaseReducer<EventFilterChangeForm> = (state, action) => {
  return {
    ...state,
    form: { ...state.form, entry: action.payload.entry, hasError: action.payload.hasError },
  };
};

const eventFilterCreateStart: CaseReducer<EventFilterCreateStart> = (state, action) => {
  return {
    ...state,
    form: { ...state.form, isLoadingAction: true },
  };
};

const eventFilterCreateSuccess: CaseReducer<EventFilterCreateSuccess> = (state, action) => {
  return {
    ...state,
    entries: [action.payload.exception, ...state.entries],
    form: { ...state.form, isLoadingAction: false, entry: undefined, hasError: false },
  };
};

const eventFilterCreateError: CaseReducer<EventFilterCreateError> = (state, action) => {
  return {
    ...state,
    form: { ...state.form, isLoadingAction: false },
  };
};

export const eventFiltersPageReducer: StateReducer = (
  state = initialEventFiltersPageState(),
  action
) => {
  switch (action.type) {
    case 'eventFilterInitForm':
      return eventFilterInitForm(state, action);
    case 'eventFilterChangeForm':
      return eventFilterChangeForm(state, action);
    case 'eventFilterCreateStart':
      return eventFilterCreateStart(state, action);
    case 'eventFilterCreateSuccess':
      return eventFilterCreateSuccess(state, action);
    case 'eventFilterCreateError':
      return eventFilterCreateError(state, action);
  }

  return state;
};
