/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

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
    hasNoAnalyticsCollections: false,
    isLoading: true,
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
          hasNoAnalyticsCollections: true,
          data: [],
          isLoading: false,
          status: Status.SUCCESS,
        });
      });

      it('updates to false when apiSuccess returns analytics collections array', () => {
        const collections: AnalyticsCollection[] = [
          {
            event_retention_day_length: 19,
            events_datastream: 'collection1-events',
            id: 'collection1',
            name: 'collection1',
          },
        ];
        FetchAnalyticsCollectionsAPILogic.actions.apiSuccess(collections);
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBe(false);
        expect(AnalyticsCollectionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          analyticsCollections: collections,
          data: collections,
          isLoading: false,
          status: Status.SUCCESS,
        });
      });
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

    it('calls makeRequest on fetchAnalyticsCollections', async () => {
      AnalyticsCollectionsLogic.actions.makeRequest = jest.fn();
      AnalyticsCollectionsLogic.actions.fetchAnalyticsCollections();
      expect(AnalyticsCollectionsLogic.actions.makeRequest).toHaveBeenCalledWith({});
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
          isLoading: false,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
