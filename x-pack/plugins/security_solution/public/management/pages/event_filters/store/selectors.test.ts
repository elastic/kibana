/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialEventFiltersPageState } from './builders';
import { getFormEntry, getFormHasError } from './selector';
import { ecsEventMock } from '../test_utils';
import { getInitialExceptionFromEvent } from './utils';

const initialState = initialEventFiltersPageState();

describe('selectors', () => {
  describe('getFormEntry()', () => {
    it('returns undefined when there is no entry', () => {
      expect(getFormEntry(initialState)).toBe(undefined);
    });
    it('returns entry when there is an entry on form', () => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          entry,
        },
      };
      expect(getFormEntry(state)).toBe(entry);
    });
  });
  describe('getFormHasError()', () => {
    it('returns false when there is no entry', () => {
      expect(getFormHasError(initialState)).toBeFalsy();
    });
    it('returns true when entry with name error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasNameError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });
    it('returns true when entry with item error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });
    it('returns true when entry with item error and name error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: true,
          hasNameError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });

    it('returns false when entry without errors', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: false,
          hasNameError: false,
        },
      };
      expect(getFormHasError(state)).toBeFalsy();
    });
  });
});
