/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AsyncResourceState } from '../state';
import { initialTrustedAppsPageState, trustedAppsPageReducer } from './reducer';
import {
  createSampleTrustedApp,
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createUserChangedUrlAction,
  createTrustedAppsListResourceStateChangedAction,
} from '../test_utils';

const initialNow = 111111;
const dateNowMock = jest.fn();
dateNowMock.mockReturnValue(initialNow);

Date.now = dateNowMock;

const initialState = initialTrustedAppsPageState();

describe('reducer', () => {
  describe('UserChangedUrl', () => {
    it('makes page state active and extracts pagination parameters', () => {
      const result = trustedAppsPageReducer(
        initialState,
        createUserChangedUrlAction('/trusted_apps', '?page_index=5&page_size=50')
      );

      expect(result).toStrictEqual({
        ...initialState,
        listView: { ...initialState.listView, currentPaginationInfo: { index: 5, size: 50 } },
        active: true,
      });
    });

    it('extracts default pagination parameters when none provided', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          listView: { ...initialState.listView, currentPaginationInfo: { index: 5, size: 50 } },
        },
        createUserChangedUrlAction('/trusted_apps', '?page_index=b&page_size=60')
      );

      expect(result).toStrictEqual({ ...initialState, active: true });
    });

    it('extracts default pagination parameters when invalid provided', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          listView: { ...initialState.listView, currentPaginationInfo: { index: 5, size: 50 } },
        },
        createUserChangedUrlAction('/trusted_apps')
      );

      expect(result).toStrictEqual({ ...initialState, active: true });
    });

    it('makes page state inactive and resets list to uninitialised state when navigating away', () => {
      const result = trustedAppsPageReducer(
        { ...initialState, listView: createLoadedListViewWithPagination(initialNow), active: true },
        createUserChangedUrlAction('/endpoints')
      );

      expect(result).toStrictEqual(initialState);
    });
  });

  describe('TrustedAppsListResourceStateChanged', () => {
    it('sets the current list resource state', () => {
      const listResourceState = createListLoadedResourceState(
        { index: 3, size: 50 },
        200,
        initialNow
      );
      const result = trustedAppsPageReducer(
        initialState,
        createTrustedAppsListResourceStateChangedAction(listResourceState)
      );

      expect(result).toStrictEqual({
        ...initialState,
        listView: { ...initialState.listView, currentListResourceState: listResourceState },
      });
    });
  });

  describe('TrustedAppsListDataOutdated', () => {
    it('sets the list view freshness timestamp', () => {
      const newNow = 222222;
      dateNowMock.mockReturnValue(newNow);

      const result = trustedAppsPageReducer(initialState, { type: 'trustedAppsListDataOutdated' });

      expect(result).toStrictEqual({
        ...initialState,
        listView: { ...initialState.listView, freshDataTimestamp: newNow },
      });
    });
  });

  describe('TrustedAppDeletionSubmissionResourceStateChanged', () => {
    it('sets the deletion dialog submission resource state', () => {
      const submissionResourceState: AsyncResourceState = {
        type: 'LoadedResourceState',
        data: null,
      };
      const result = trustedAppsPageReducer(initialState, {
        type: 'trustedAppDeletionSubmissionResourceStateChanged',
        payload: { newState: submissionResourceState },
      });

      expect(result).toStrictEqual({
        ...initialState,
        deletionDialog: { ...initialState.deletionDialog, submissionResourceState },
      });
    });
  });

  describe('TrustedAppDeletionDialogStarted', () => {
    it('sets the deletion dialog state to started', () => {
      const entry = createSampleTrustedApp(3);
      const result = trustedAppsPageReducer(initialState, {
        type: 'trustedAppDeletionDialogStarted',
        payload: { entry },
      });

      expect(result).toStrictEqual({
        ...initialState,
        deletionDialog: { ...initialState.deletionDialog, entry },
      });
    });
  });

  describe('TrustedAppDeletionDialogConfirmed', () => {
    it('sets the deletion dialog state to confirmed', () => {
      const entry = createSampleTrustedApp(3);
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          deletionDialog: {
            entry,
            confirmed: false,
            submissionResourceState: { type: 'UninitialisedResourceState' },
          },
        },
        { type: 'trustedAppDeletionDialogConfirmed' }
      );

      expect(result).toStrictEqual({
        ...initialState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: { type: 'UninitialisedResourceState' },
        },
      });
    });
  });

  describe('TrustedAppDeletionDialogClosed', () => {
    it('sets the deletion dialog state to confirmed', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          deletionDialog: {
            entry: createSampleTrustedApp(3),
            confirmed: true,
            submissionResourceState: { type: 'UninitialisedResourceState' },
          },
        },
        { type: 'trustedAppDeletionDialogClosed' }
      );

      expect(result).toStrictEqual(initialState);
    });
  });
});
