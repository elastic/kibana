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
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { HttpError, Status } from '../../../../../common/types/api';

import { AddAnalyticsCollectionLogic } from './add_analytics_collection_logic';

describe('addAnalyticsCollectionLogic', () => {
  const { mount } = new LogicMounter(AddAnalyticsCollectionLogic);
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(AddAnalyticsCollectionLogic.values).toEqual({
      canSubmit: false,
      isLoading: false,
      name: '',
      status: Status.IDLE,
    });
  });

  describe('actions', () => {
    describe('setNameValue', () => {
      it('should set name', () => {
        AddAnalyticsCollectionLogic.actions.setNameValue('valid');
        expect(AddAnalyticsCollectionLogic.values).toEqual({
          canSubmit: true,
          isLoading: false,
          name: 'valid',
          status: Status.IDLE,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('onApiSuccess', () => {
      it('should flash a success toast and navigate to collection view', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });

        const { navigateToUrl } = mockKibanaValues;

        AddAnalyticsCollectionLogic.actions.apiSuccess({
          event_retention_day_length: 180,
          events_datastream: 'logs-elastic_analytics.events-test',
          id: 'test',
          name: 'test',
        } as AnalyticsCollection);

        expect(flashSuccessToast).toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        await nextTick();
        expect(navigateToUrl).toHaveBeenCalledWith('/collections/test/events');
        jest.useRealTimers();
      });
    });

    describe('onApiError', () => {
      it('should flash an error toast', () => {
        const httpError: HttpError = {
          body: {
            error: 'Bad Request',
            statusCode: 400,
          },
          fetchOptions: {},
          request: {},
        } as HttpError;
        AddAnalyticsCollectionLogic.actions.apiError(httpError);

        expect(flashAPIErrors).toHaveBeenCalledWith(httpError);
      });
    });

    describe('createAnalyticsCollection', () => {
      it('should call make request', () => {
        mount({
          name: 'test',
        });
        AddAnalyticsCollectionLogic.actions.makeRequest = jest.fn();
        AddAnalyticsCollectionLogic.actions.createAnalyticsCollection();
        expect(AddAnalyticsCollectionLogic.actions.makeRequest).toHaveBeenCalledWith({
          name: 'test',
        });
      });
    });
  });

  describe('selectors', () => {
    describe('loading & status', () => {
      it('updates when makeRequest triggered', () => {
        const promise = Promise.resolve({ name: 'result' });
        http.post.mockReturnValue(promise);
        AddAnalyticsCollectionLogic.actions.makeRequest({ name: 'test' });

        expect(AddAnalyticsCollectionLogic.values.isLoading).toBe(true);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.LOADING);
      });

      it('updates when apiSuccess listener triggered', () => {
        AddAnalyticsCollectionLogic.actions.apiSuccess({
          event_retention_day_length: 180,
          events_datastream: 'logs-elastic_analytics.events-test',
          id: 'bla',
          name: 'test',
        });

        expect(AddAnalyticsCollectionLogic.values.isLoading).toBe(true);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.SUCCESS);
      });
    });
  });
});
