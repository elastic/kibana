/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialEventFiltersPageState } from './builders';
import { eventFiltersPageReducer } from './reducer';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntryMock, ecsEventMock } from '../test_utils';

const initialState = initialEventFiltersPageState();

describe('reducer', () => {
  describe('EventFiltersForm', () => {
    it('sets the initial form values', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          entry,
          hasNameError: !entry.name,
          submissionResourceState: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });

    it('change form values', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const nameChanged = 'name changed';
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersChangeForm',
        payload: { entry: { ...entry, name: nameChanged } },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          entry: {
            ...entry,
            name: nameChanged,
          },
          hasNameError: false,
          submissionResourceState: {
            type: 'UninitialisedResourceState',
          },
        },
      });
    });

    it('change form status', () => {
      const result = eventFiltersPageReducer(initialState, {
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: createdEventFilterEntryMock(),
        },
      });

      expect(result).toStrictEqual({
        ...initialState,
        form: {
          ...initialState.form,
          submissionResourceState: {
            type: 'LoadedResourceState',
            data: createdEventFilterEntryMock(),
          },
        },
      });
    });
  });
});
