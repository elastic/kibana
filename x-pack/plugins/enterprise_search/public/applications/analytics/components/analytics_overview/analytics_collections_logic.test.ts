/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';

import { AnalyticsCollectionsLogic } from './analytics_collections_logic';

describe('analyticsCollectionsLogic', () => {
  const { mount } = new LogicMounter(AnalyticsCollectionsLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    analyticsCollections: [],
    data: undefined,
    hasNoAnalyticsCollections: false,
    isLoading: true,
    status: Status.IDLE,
    isFirstRequest: true,
  };

  it('has expected default values', () => {
    expect(AnalyticsCollectionsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('reducers', () => {
    describe('hasNoAnalyticsCollections', () => {
      it('updates to true when apiSuccess returns empty analytics collections array', () => {
        AnalyticsCollectionsLogic.actions.apiSuccess([]);
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBe(true);
        expect(AnalyticsCollectionsLogic.values).toEqual(
          expect.objectContaining({
            analyticsCollections: [],
            data: [],
            isFirstRequest: false,
            isLoading: false,
          })
        );
      });

      it('updates to false when apiSuccess returns analytics collections array', () => {
        const collections = [
          { event_retention_day_length: 19, id: 'collection1', name: 'collection1' },
        ];
        AnalyticsCollectionsLogic.actions.apiSuccess(collections);
        expect(AnalyticsCollectionsLogic.values.hasNoAnalyticsCollections).toBe(false);
        expect(AnalyticsCollectionsLogic.values).toEqual(
          expect.objectContaining({
            analyticsCollections: collections,
            data: collections,
            isFirstRequest: false,
            isLoading: false,
          })
        );
      });
    });

    describe('isFirstRequest', () => {
      it('should update to true on setIsFirstRequest', () => {
        AnalyticsCollectionsLogic.actions.setIsFirstRequest();
        expect(AnalyticsCollectionsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFirstRequest: true,
        });
      });

      it('should update to false on apiError', () => {
        AnalyticsCollectionsLogic.actions.setIsFirstRequest();
        AnalyticsCollectionsLogic.actions.apiError({} as HttpError);

        expect(AnalyticsCollectionsLogic.values).toEqual(
          expect.objectContaining({
            isFirstRequest: false,
            isLoading: false,
            status: Status.ERROR,
          })
        );
      });

      it('should update to false on apiSuccess', () => {
        AnalyticsCollectionsLogic.actions.setIsFirstRequest();
        AnalyticsCollectionsLogic.actions.apiSuccess([]);

        expect(AnalyticsCollectionsLogic.values).toEqual(
          expect.objectContaining({
            isFirstRequest: false,
            isLoading: false,
            status: Status.SUCCESS,
          })
        );
      });
    });
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', () => {
      AnalyticsCollectionsLogic.actions.makeRequest({});
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });

    it('calls flashAPIErrors on apiError', () => {
      AnalyticsCollectionsLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });

    it('calls makeRequest on fetchAnalyticsCollections', async () => {
      jest.useFakeTimers();
      AnalyticsCollectionsLogic.actions.makeRequest = jest.fn();
      AnalyticsCollectionsLogic.actions.fetchAnalyticsCollections();
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(AnalyticsCollectionsLogic.actions.makeRequest).toHaveBeenCalledWith({});
    });
  });

  describe('selectors', () => {
    describe('analyticsCollections', () => {
      it('updates when apiSuccess listener triggered', () => {
        AnalyticsCollectionsLogic.actions.apiSuccess([]);

        expect(AnalyticsCollectionsLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            analyticsCollections: [],
            data: [],
            hasNoAnalyticsCollections: true,
            isFirstRequest: false,
            isLoading: false,
            status: Status.SUCCESS,
          })
        );
      });
    });
  });
});
