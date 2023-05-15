/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { HttpError, Status } from '../../../../../common/types/api';

import { FetchAnalyticsCollectionsAPILogic } from '../../api/index/fetch_analytics_collections_api_logic';

import { AnalyticsCollectionsLogic } from './analytics_collections_logic';

describe('analyticsCollectionsLogic', () => {
  const { mount: apiMount } = new LogicMounter(FetchAnalyticsCollectionsAPILogic);
  const { mount } = new LogicMounter(AnalyticsCollectionsLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiMount();
    mount();
  });

  const DEFAULT_VALUES = {
    analyticsCollections: [],
    data: undefined,
    hasNoAnalyticsCollections: true,
    isFetching: true,
    isSearchRequest: false,
    isSearching: false,
    searchQuery: '',
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(AnalyticsCollectionsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('hasNoAnalyticsCollections', () => {
      it('updates to true when apiSuccess returns empty analytics collections array', () => {
        FetchAnalyticsCollectionsAPILogic.actions.apiSuccess([]);
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBe(true);
        expect(AnalyticsCollectionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          analyticsCollections: [],
          data: [],
          hasNoAnalyticsCollections: true,
          isFetching: false,
          status: Status.SUCCESS,
        });
      });

      it('updates to false when apiSuccess returns analytics collections array', () => {
        const collections: AnalyticsCollection[] = [
          {
            events_datastream: 'collection1-events',
            name: 'collection1',
          },
        ];
        FetchAnalyticsCollectionsAPILogic.actions.apiSuccess(collections);
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBe(false);
        expect(AnalyticsCollectionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          analyticsCollections: collections,
          hasNoAnalyticsCollections: false,
          data: collections,
          isFetching: false,
          status: Status.SUCCESS,
        });
      });
    });

    it('updates searchQuery when searchAnalyticsCollections is called', () => {
      AnalyticsCollectionsLogic.actions.searchAnalyticsCollections('test');
      expect(AnalyticsCollectionsLogic.values.searchQuery).toBe('test');
    });

    it('updates isSearchRequest when searchAnalyticsCollections is called', () => {
      AnalyticsCollectionsLogic.actions.searchAnalyticsCollections('test');
      expect(AnalyticsCollectionsLogic.values.isSearchRequest).toBe(true);
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', () => {
      AnalyticsCollectionsLogic.actions.makeRequest({});
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });

    it('calls flashAPIErrors on apiError', () => {
      FetchAnalyticsCollectionsAPILogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });

    it('calls makeRequest on fetchAnalyticsCollections', () => {
      AnalyticsCollectionsLogic.actions.makeRequest = jest.fn();
      AnalyticsCollectionsLogic.actions.fetchAnalyticsCollections();
      expect(AnalyticsCollectionsLogic.actions.makeRequest).toHaveBeenCalledWith({});
    });

    it('calls makeRequest query on searchAnalyticsCollections', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      AnalyticsCollectionsLogic.actions.makeRequest = jest.fn();
      AnalyticsCollectionsLogic.actions.searchAnalyticsCollections('test');
      jest.advanceTimersByTime(200);
      await nextTick();
      expect(AnalyticsCollectionsLogic.actions.makeRequest).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('selectors', () => {
    describe('analyticsCollections', () => {
      it('updates when apiSuccess listener triggered', () => {
        FetchAnalyticsCollectionsAPILogic.actions.apiSuccess([]);

        expect(AnalyticsCollectionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          analyticsCollections: [],
          data: [],
          hasNoAnalyticsCollections: true,
          isFetching: false,
          status: Status.SUCCESS,
        });
      });
    });

    describe('isFetching', () => {
      it('updates on initialState', () => {
        expect(AnalyticsCollectionsLogic.values.isFetching).toBe(true);
      });

      it('updates when fetchAnalyticsCollections listener triggered', () => {
        AnalyticsCollectionsLogic.actions.fetchAnalyticsCollections();
        expect(AnalyticsCollectionsLogic.values.isFetching).toBe(true);
      });

      it('updates when apiSuccess listener triggered', () => {
        FetchAnalyticsCollectionsAPILogic.actions.apiSuccess([]);
        expect(AnalyticsCollectionsLogic.values.isFetching).toBe(false);
      });

      it('updates when search request triggered', () => {
        AnalyticsCollectionsLogic.actions.searchAnalyticsCollections('test');
        expect(AnalyticsCollectionsLogic.values.isFetching).toBe(false);
      });
    });

    describe('isSearching', () => {
      it('updates on initialState', () => {
        expect(AnalyticsCollectionsLogic.values.isSearching).toBe(false);
      });

      it('updates when fetchAnalyticsCollections listener triggered', () => {
        AnalyticsCollectionsLogic.actions.fetchAnalyticsCollections();
        expect(AnalyticsCollectionsLogic.values.isSearching).toBe(false);
      });

      it('updates when apiSuccess listener triggered', () => {
        FetchAnalyticsCollectionsAPILogic.actions.apiSuccess([]);
        expect(AnalyticsCollectionsLogic.values.isSearching).toBe(false);
      });
    });

    describe('hasNoAnalyticsCollections', () => {
      it('returns false when no items and search query is not empty', () => {
        AnalyticsCollectionsLogic.actions.searchAnalyticsCollections('test');
        expect(AnalyticsCollectionsLogic.values.searchQuery).toBe('test');
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBe(false);
      });

      it('returns true when no items and search query is empty', () => {
        AnalyticsCollectionsLogic.actions.searchAnalyticsCollections('');
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBeTruthy();
      });

      it('returns true when no items and search query is undefined', () => {
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBeTruthy();
      });
    });
  });
});
