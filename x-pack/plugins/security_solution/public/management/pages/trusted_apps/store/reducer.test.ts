/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncResourceState } from '../state';
import { initialTrustedAppsPageState } from './builders';
import { trustedAppsPageReducer } from './reducer';
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
    it('makes page state active and extracts all parameters', () => {
      const result = trustedAppsPageReducer(
        initialState,
        createUserChangedUrlAction(
          '/administration/trusted_apps',
          '?page_index=5&page_size=50&show=create&view_type=list&filter=test&included_policies=global'
        )
      );

      expect(result).toStrictEqual({
        ...initialState,
        location: {
          page_index: 5,
          page_size: 50,
          show: 'create',
          view_type: 'list',
          id: undefined,
          filter: 'test',
          included_policies: 'global',
        },
        active: true,
      });
    });

    it('extracts default pagination parameters when invalid provided', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          location: {
            page_index: 5,
            page_size: 50,
            view_type: 'grid',
            filter: '',
            included_policies: '',
          },
        },
        createUserChangedUrlAction(
          '/administration/trusted_apps',
          '?page_index=b&page_size=60&show=a&view_type=c'
        )
      );

      expect(result).toStrictEqual({ ...initialState, active: true });
    });

    it('extracts default pagination parameters when none provided', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          location: {
            page_index: 5,
            page_size: 50,
            view_type: 'grid',
            filter: '',
            included_policies: '',
          },
        },
        createUserChangedUrlAction('/administration/trusted_apps')
      );

      expect(result).toStrictEqual({ ...initialState, active: true });
    });

    it('makes page state inactive and resets list to uninitialised state when navigating away', () => {
      const result = trustedAppsPageReducer(
        { ...initialState, listView: createLoadedListViewWithPagination(initialNow), active: true },
        createUserChangedUrlAction('/administration/endpoints')
      );

      expect(result).toStrictEqual(initialState);
    });
  });

  describe('TrustedAppsListResourceStateChanged', () => {
    it('sets the current list resource state', () => {
      const listResourceState = createListLoadedResourceState(
        { pageIndex: 3, pageSize: 50 },
        initialNow
      );
      const result = trustedAppsPageReducer(
        initialState,
        createTrustedAppsListResourceStateChangedAction(listResourceState)
      );

      expect(result).toStrictEqual({
        ...initialState,
        listView: { ...initialState.listView, listResourceState },
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

  describe('TrustedAppsForceRefresh', () => {
    it('sets the force refresh state to true', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          forceRefresh: false,
        },
        { type: 'trustedAppForceRefresh', payload: { forceRefresh: true } }
      );

      expect(result).toStrictEqual({ ...initialState, forceRefresh: true });
    });
    it('sets the force refresh state to false', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialState,
          forceRefresh: true,
        },
        { type: 'trustedAppForceRefresh', payload: { forceRefresh: false } }
      );

      expect(result).toStrictEqual({ ...initialState, forceRefresh: false });
    });
  });
});
