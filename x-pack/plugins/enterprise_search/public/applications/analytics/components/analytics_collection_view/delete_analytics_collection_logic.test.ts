/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { Status } from '../../../../../common/types/api';

import { DeleteAnalyticsCollectionLogic } from './delete_analytics_collection_logic';

describe('deleteAnalyticsCollectionLogic', () => {
  const { mount } = new LogicMounter(DeleteAnalyticsCollectionLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    isLoading: true,
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(DeleteAnalyticsCollectionLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    it('calls clearFlashMessages on new makeRequest', async () => {
      const promise = Promise.resolve(undefined);
      http.delete.mockReturnValue(promise);

      await nextTick();

      DeleteAnalyticsCollectionLogic.actions.makeRequest({ name: 'name' } as AnalyticsCollection);
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });

    it('calls makeRequest on deleteAnalyticsCollections', async () => {
      const collectionName = 'name';

      jest.useFakeTimers({ legacyFakeTimers: true });
      DeleteAnalyticsCollectionLogic.actions.makeRequest = jest.fn();
      DeleteAnalyticsCollectionLogic.actions.deleteAnalyticsCollection(collectionName);
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(DeleteAnalyticsCollectionLogic.actions.makeRequest).toHaveBeenCalledWith({
        id: collectionName,
      });
    });
  });

  describe('selectors', () => {
    describe('analyticsCollection', () => {
      it('updates when apiSuccess listener triggered', () => {
        DeleteAnalyticsCollectionLogic.actions.apiSuccess();

        expect(DeleteAnalyticsCollectionLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: false,
          status: Status.SUCCESS,
        });
      });
    });
  });
});
