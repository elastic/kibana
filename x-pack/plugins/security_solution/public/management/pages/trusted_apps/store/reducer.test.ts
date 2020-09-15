/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initialTrustedAppsPageState, trustedAppsPageReducer } from './reducer';
import {
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createTrustedAppsListResourceStateChangedAction,
  createUserChangedUrlAction,
} from '../test_utils';

describe('reducer', () => {
  describe('UserChangedUrl', () => {
    it('makes page state active and extracts pagination parameters', () => {
      const result = trustedAppsPageReducer(
        initialTrustedAppsPageState,
        createUserChangedUrlAction('/trusted_apps', '?page_index=5&page_size=50')
      );

      expect(result).toStrictEqual({
        listView: {
          ...initialTrustedAppsPageState.listView,
          currentPaginationInfo: { index: 5, size: 50 },
        },
        active: true,
      });
    });

    it('extracts default pagination parameters when none provided', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialTrustedAppsPageState,
          listView: {
            ...initialTrustedAppsPageState.listView,
            currentPaginationInfo: { index: 5, size: 50 },
          },
        },
        createUserChangedUrlAction('/trusted_apps', '?page_index=b&page_size=60')
      );

      expect(result).toStrictEqual({
        ...initialTrustedAppsPageState,
        active: true,
      });
    });

    it('extracts default pagination parameters when invalid provided', () => {
      const result = trustedAppsPageReducer(
        {
          ...initialTrustedAppsPageState,
          listView: {
            ...initialTrustedAppsPageState.listView,
            currentPaginationInfo: { index: 5, size: 50 },
          },
        },
        createUserChangedUrlAction('/trusted_apps')
      );

      expect(result).toStrictEqual({
        ...initialTrustedAppsPageState,
        active: true,
      });
    });

    it('makes page state inactive and resets list to uninitialised state when navigating away', () => {
      const result = trustedAppsPageReducer(
        { listView: createLoadedListViewWithPagination(), active: true },
        createUserChangedUrlAction('/endpoints')
      );

      expect(result).toStrictEqual(initialTrustedAppsPageState);
    });
  });

  describe('TrustedAppsListResourceStateChanged', () => {
    it('sets the current list resource state', () => {
      const listResourceState = createListLoadedResourceState({ index: 3, size: 50 }, 200);
      const result = trustedAppsPageReducer(
        initialTrustedAppsPageState,
        createTrustedAppsListResourceStateChangedAction(listResourceState)
      );

      expect(result).toStrictEqual({
        ...initialTrustedAppsPageState,
        listView: {
          ...initialTrustedAppsPageState.listView,
          currentListResourceState: listResourceState,
        },
      });
    });
  });
});
