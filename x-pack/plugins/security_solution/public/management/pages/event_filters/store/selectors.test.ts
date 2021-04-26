/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialEventFiltersPageState } from './builders';
import { getFormEntry, getFormHasError, getCurrentLocation } from './selector';
import { ecsEventMock } from '../test_utils';
import { getInitialExceptionFromEvent } from './utils';
import { EventFiltersPageLocation } from '../state';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../../common/constants';

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
    it('returns true when entry with os error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasOSError: true,
        },
      };
      expect(getFormHasError(state)).toBeTruthy();
    });
    it('returns true when entry with item error, name error and os error', () => {
      const state = {
        ...initialState,
        form: {
          ...initialState.form,
          hasItemsError: true,
          hasNameError: true,
          hasOSError: true,
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
          hasOSError: false,
        },
      };
      expect(getFormHasError(state)).toBeFalsy();
    });
  });
  describe('getCurrentLocation()', () => {
    it('returns current locations', () => {
      const expectedLocation: EventFiltersPageLocation = {
        show: 'create',
        page_index: MANAGEMENT_DEFAULT_PAGE,
        page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
        filter: 'filter',
      };
      const state = {
        ...initialState,
        location: expectedLocation,
      };
      expect(getCurrentLocation(state)).toBe(expectedLocation);
    });
  });
});
