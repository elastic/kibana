/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialEventFilterPageState } from './builders';
import { eventFilterPageReducer } from './reducer';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntryMock, ecsEventMock } from '../test_utils';

const initialState = initialEventFilterPageState();

describe('reducer', () => {
  describe('EventFilterForm', () => {
    it('sets the initial form values', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const result = eventFilterPageReducer(initialState, {
        type: 'eventFilterInitForm',
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
      const result = eventFilterPageReducer(initialState, {
        type: 'eventFilterChangeForm',
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
      const result = eventFilterPageReducer(initialState, {
        type: 'eventFilterFormStateChanged',
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
