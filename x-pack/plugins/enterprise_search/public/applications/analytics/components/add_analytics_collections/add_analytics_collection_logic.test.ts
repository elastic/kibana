import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError, Status } from '../../../../../common/types/api';

import { AddAnalyticsCollectionLogic } from './add_analytics_collection_logic';
import { AnalyticsCollection } from '../../../../../common/types/analytics';

describe('addAnalyticsCollectionLogic', () => {
  const { mount } = new LogicMounter(AddAnalyticsCollectionLogic);
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  it('has expected default values', () => {
    expect(AddAnalyticsCollectionLogic.values).toEqual({
      canSubmit: false,
      hasInputError: false,
      inputError: false,
      isLoading: false,
      name: '',
      status: Status.IDLE,
    });
  });

  describe('actions', () => {
    describe('setInputError', () => {
      it('should set error state', () => {
        AddAnalyticsCollectionLogic.actions.setInputError('error');
        expect(AddAnalyticsCollectionLogic.values).toEqual({
          canSubmit: false,
          hasInputError: true,
          inputError: 'error',
          isLoading: false,
          name: '',
          status: Status.IDLE,
        });
      });

      it('should reset error state', () => {
        AddAnalyticsCollectionLogic.actions.setInputError(false);
        expect(AddAnalyticsCollectionLogic.values).toEqual({
          canSubmit: false,
          hasInputError: false,
          inputError: false,
          isLoading: false,
          name: '',
          status: Status.IDLE,
        });
      });
    });

    describe('setNameValue', () => {
      it('should error when name is invalid', () => {
        AddAnalyticsCollectionLogic.actions.setNameValue('!invalid');
        expect(AddAnalyticsCollectionLogic.values).toEqual({
          canSubmit: false,
          hasInputError: true,
          inputError: 'Name must only contain alphanumeric characters and underscores',
          isLoading: false,
          name: '!invalid',
          status: Status.IDLE,
        });
      });

      it('should not show error when name is valid', () => {
        AddAnalyticsCollectionLogic.actions.setNameValue('valid');
        expect(AddAnalyticsCollectionLogic.values).toEqual({
          canSubmit: true,
          hasInputError: false,
          inputError: false,
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
        jest.useFakeTimers();

        const { navigateToUrl } = mockKibanaValues;

        AddAnalyticsCollectionLogic.actions.apiSuccess({
          event_retention_day_length: 180,
          id: 'bla',
          name: 'test',
        } as AnalyticsCollection);

        expect(flashSuccessToast).toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        await nextTick();
        expect(navigateToUrl).toHaveBeenCalledWith('/collections/test');
        jest.useRealTimers();
      });
    });

    describe('onApiError', () => {
      it('should flash an error toast', async () => {
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
          id: 'bla',
          name: 'test',
        });

        expect(AddAnalyticsCollectionLogic.values.isLoading).toBe(true);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.SUCCESS);
      });
    });
  });
});
