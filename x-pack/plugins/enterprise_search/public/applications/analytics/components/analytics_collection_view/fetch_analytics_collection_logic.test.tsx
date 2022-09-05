/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { HttpError, Status } from '../../../../../common/types/api';

import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

describe('fetchAnalyticsCollectionLogic', () => {
  const { mount } = new LogicMounter(FetchAnalyticsCollectionLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    analyticsCollection: {},
    data: undefined,
    hasNoAnalyticsCollection: true,
    isLoading: true,
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(FetchAnalyticsCollectionLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('hasNoAnalyticsCollection', () => {
      it('updates to true when apiSuccess returns empty analytics collections array', () => {
        FetchAnalyticsCollectionLogic.actions.apiSuccess({} as AnalyticsCollection);
        expect(FetchAnalyticsCollectionLogic.values.hasNoAnalyticsCollection).toBe(true);
        expect(FetchAnalyticsCollectionLogic.values).toEqual({
          ...DEFAULT_VALUES,
          analyticsCollection: {},
          hasNoAnalyticsCollection: true,
          data: {},
          isLoading: false,
          status: Status.SUCCESS,
        });
      });

      it('updates to false when apiSuccess returns analytics collections array', () => {
        const collection = {
          event_retention_day_length: 19,
          id: 'collection1',
          name: 'collection1',
        };
        FetchAnalyticsCollectionLogic.actions.apiSuccess(collection);
        expect(FetchAnalyticsCollectionLogic.values.hasNoAnalyticsCollection).toBe(false);
        expect(FetchAnalyticsCollectionLogic.values).toEqual({
          analyticsCollection: collection,
          data: collection,
          hasNoAnalyticsCollection: false,
          isLoading: false,
          status: Status.SUCCESS,
        });
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', () => {
      FetchAnalyticsCollectionLogic.actions.makeRequest({} as AnalyticsCollection);
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });

    it('calls flashAPIErrors on apiError', () => {
      FetchAnalyticsCollectionLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });

    it('calls makeRequest on fetchAnalyticsCollections', async () => {
      const name = 'name';

      FetchAnalyticsCollectionLogic.actions.makeRequest = jest.fn();
      FetchAnalyticsCollectionLogic.actions.fetchAnalyticsCollection(name);
      expect(FetchAnalyticsCollectionLogic.actions.makeRequest).toHaveBeenCalledWith({
        name,
      });
    });
  });

  describe('selectors', () => {
    describe('analyticsCollections', () => {
      it('updates when apiSuccess listener triggered', () => {
        FetchAnalyticsCollectionLogic.actions.apiSuccess({} as AnalyticsCollection);

        expect(FetchAnalyticsCollectionLogic.values).toEqual({
          ...DEFAULT_VALUES,
          analyticsCollection: {},
          data: {},
          hasNoAnalyticsCollection: true,
          isLoading: false,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
