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
  EventFiltersInitForm,
  EventFiltersChangeForm,
  EventFiltersFormStateChanged,
  EventFiltersCreateSuccess,
} from './action';

import { EventFiltersListPageState } from '../state';
import { initialEventFiltersPageState } from './builders';

type StateReducer = ImmutableReducer<EventFiltersListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EventFiltersListPageState>,
  action: Immutable<T>
) => Immutable<EventFiltersListPageState>;

const eventFiltersInitForm: CaseReducer<EventFiltersInitForm> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      entry: action.payload.entry,
      hasNameError: !action.payload.entry.name,
      hasOSError: !action.payload.entry.os_types?.length,
      submissionResourceState: {
        type: 'UninitialisedResourceState',
      },
    },
  };
};

const eventFiltersChangeForm: CaseReducer<EventFiltersChangeForm> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      entry: action.payload.entry,
      hasItemsError:
        action.payload.hasItemsError !== undefined
          ? action.payload.hasItemsError
          : state.form.hasItemsError,
      hasNameError:
        action.payload.hasNameError !== undefined
          ? action.payload.hasNameError
          : state.form.hasNameError,
      hasOSError:
        action.payload.hasOSError !== undefined ? action.payload.hasOSError : state.form.hasOSError,
    },
  };
};

const eventFiltersFormStateChanged: CaseReducer<EventFiltersFormStateChanged> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      submissionResourceState: action.payload,
    },
  };
};

const eventFiltersCreateSuccess: CaseReducer<EventFiltersCreateSuccess> = (state, action) => {
  return {
    ...state,
    entries: [action.payload.exception, ...state.entries],
  };
};

export const eventFiltersPageReducer: StateReducer = (
  state = initialEventFiltersPageState(),
  action
) => {
  switch (action.type) {
    case 'eventFiltersInitForm':
      return eventFiltersInitForm(state, action);
    case 'eventFiltersChangeForm':
      return eventFiltersChangeForm(state, action);
    case 'eventFiltersFormStateChanged':
      return eventFiltersFormStateChanged(state, action);
    case 'eventFiltersCreateSuccess':
      return eventFiltersCreateSuccess(state, action);
  }

  return state;
};
