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
  EventFilterFormStateChanged,
  EventFilterCreateError,
} from './action';

import { EventFilterListPageState } from '../state';
import { initialEventFilterPageState } from './builders';

type StateReducer = ImmutableReducer<EventFilterListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EventFilterListPageState>,
  action: Immutable<T>
) => Immutable<EventFilterListPageState>;

const eventFilterInitForm: CaseReducer<EventFilterInitForm> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      entry: action.payload.entry,
      submissionResourceState: {
        type: 'UninitialisedResourceState',
      },
    },
  };
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
    form: {
      ...state.form,
      isLoadingAction: true,
      submissionResourceState: {
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      },
    },
  };
};

const eventFilterFormStateChanged: CaseReducer<EventFilterFormStateChanged> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      submissionResourceState: action.payload,
    },
  };
};

export const eventFilterPageReducer: StateReducer = (
  state = initialEventFilterPageState(),
  action
) => {
  switch (action.type) {
    case 'eventFilterInitForm':
      return eventFilterInitForm(state, action);
    case 'eventFilterChangeForm':
      return eventFilterChangeForm(state, action);
    case 'eventFilterCreateStart':
      return eventFilterCreateStart(state, action);
    case 'eventFilterFormStateChanged':
      return eventFilterFormStateChanged(state, action);
  }

  return state;
};
