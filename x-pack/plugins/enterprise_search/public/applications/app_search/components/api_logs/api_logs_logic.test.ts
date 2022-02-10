/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';
import { mockApiLog } from './__mocks__/api_log.mock';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { DEFAULT_META } from '../../../shared/constants';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { ApiLogsLogic } from './';

describe('ApiLogsLogic', () => {
  const { mount, unmount } = new LogicMounter(ApiLogsLogic);
  const { http } = mockHttpValues;
  const { flashErrorToast } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    apiLogs: [],
    meta: DEFAULT_META,
    hasNewData: false,
    polledData: {},
    intervalId: null,
  };

  const MOCK_API_RESPONSE = {
    results: [mockApiLog, mockApiLog],
    meta: {
      page: {
        current: 1,
        total_pages: 10,
        total_results: 100,
        size: 10,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ApiLogsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onPollStart', () => {
      it('sets intervalId state', () => {
        mount();
        ApiLogsLogic.actions.onPollStart(123);

        expect(ApiLogsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          intervalId: 123,
        });
      });
    });

    describe('storePolledData', () => {
      it('sets hasNewData to true & polledData state', () => {
        mount({ hasNewData: false });
        ApiLogsLogic.actions.storePolledData(MOCK_API_RESPONSE);

        expect(ApiLogsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasNewData: true,
          polledData: MOCK_API_RESPONSE,
        });
      });
    });

    describe('updateView', () => {
      it('sets dataLoading & hasNewData to false, sets apiLogs & meta state', () => {
        mount({ dataLoading: true, hasNewData: true });
        ApiLogsLogic.actions.updateView(MOCK_API_RESPONSE);

        expect(ApiLogsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          hasNewData: false,
          apiLogs: MOCK_API_RESPONSE.results,
          meta: MOCK_API_RESPONSE.meta,
        });
      });
    });

    describe('onPaginate', () => {
      it('sets dataLoading to true & sets meta state', () => {
        mount({ dataLoading: false });
        ApiLogsLogic.actions.onPaginate(5);

        expect(ApiLogsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
          meta: {
            ...DEFAULT_META,
            page: {
              ...DEFAULT_META.page,
              current: 5,
            },
          },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('pollForApiLogs', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      it('starts a poll that calls fetchApiLogs at set intervals', () => {
        mount();
        jest.spyOn(ApiLogsLogic.actions, 'onPollStart');
        jest.spyOn(ApiLogsLogic.actions, 'fetchApiLogs');

        ApiLogsLogic.actions.pollForApiLogs();
        expect(setIntervalSpy).toHaveBeenCalled();
        expect(ApiLogsLogic.actions.onPollStart).toHaveBeenCalled();

        jest.advanceTimersByTime(5000);
        expect(ApiLogsLogic.actions.fetchApiLogs).toHaveBeenCalledWith({ isPoll: true });
      });

      it('does not create new polls if one already exists', () => {
        mount({ intervalId: 123 });
        ApiLogsLogic.actions.pollForApiLogs();
        expect(setIntervalSpy).not.toHaveBeenCalled();
      });

      afterAll(() => jest.useRealTimers);
    });

    describe('fetchApiLogs', () => {
      const mockDate = jest
        .spyOn(global.Date, 'now')
        .mockImplementation(() => new Date('1970-01-02').valueOf());

      afterAll(() => mockDate.mockRestore());

      it('should make an API call', () => {
        mount();

        ApiLogsLogic.actions.fetchApiLogs();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/api_logs', {
          query: {
            'page[current]': 1,
            'filters[date][from]': '1970-01-01T00:00:00.000Z',
            'filters[date][to]': '1970-01-02T00:00:00.000Z',
            sort_direction: 'desc',
          },
        });
      });

      describe('manual fetch (page load & pagination)', () => {
        it('updates the view immediately with the returned data', async () => {
          http.get.mockReturnValueOnce(Promise.resolve(MOCK_API_RESPONSE));
          mount();
          jest.spyOn(ApiLogsLogic.actions, 'updateView');

          ApiLogsLogic.actions.fetchApiLogs();
          await nextTick();

          expect(ApiLogsLogic.actions.updateView).toHaveBeenCalledWith(MOCK_API_RESPONSE);
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          mount();
          ApiLogsLogic.actions.fetchApiLogs();
        });
      });

      describe('poll fetch (interval)', () => {
        it('does not automatically update the view', async () => {
          http.get.mockReturnValueOnce(Promise.resolve(MOCK_API_RESPONSE));
          mount({ dataLoading: false });
          jest.spyOn(ApiLogsLogic.actions, 'onPollInterval');

          ApiLogsLogic.actions.fetchApiLogs({ isPoll: true });
          await nextTick();

          expect(ApiLogsLogic.actions.onPollInterval).toHaveBeenCalledWith(MOCK_API_RESPONSE);
        });

        it('sets a custom error message on poll error', async () => {
          http.get.mockReturnValueOnce(Promise.reject('error'));
          mount({ dataLoading: false });

          ApiLogsLogic.actions.fetchApiLogs({ isPoll: true });
          await nextTick();

          expect(flashErrorToast).toHaveBeenCalledWith('Could not refresh API log data', {
            text: expect.stringContaining('Please check your connection'),
            toastLifeTimeMs: 3750,
          });
        });
      });

      describe('when a manual fetch and a poll fetch occur at the same time', () => {
        it('should short-circuit polls in favor of manual fetches', async () => {
          // dataLoading is the signal we're using to check for a manual fetch
          mount({ dataLoading: true });
          jest.spyOn(ApiLogsLogic.actions, 'onPollInterval');

          ApiLogsLogic.actions.fetchApiLogs({ isPoll: true });
          await nextTick();

          expect(http.get).not.toHaveBeenCalled();
          expect(ApiLogsLogic.actions.onPollInterval).not.toHaveBeenCalled();
        });
      });
    });

    describe('onPollInterval', () => {
      describe('when API logs are empty and new polled data comes in', () => {
        it('updates the view immediately with the returned data (no manual action required)', () => {
          mount({ meta: { page: { total_results: 0 } } });
          jest.spyOn(ApiLogsLogic.actions, 'updateView');

          ApiLogsLogic.actions.onPollInterval(MOCK_API_RESPONSE);

          expect(ApiLogsLogic.actions.updateView).toHaveBeenCalledWith(MOCK_API_RESPONSE);
        });
      });

      describe('when previous API logs already exist on the page', () => {
        describe('when new data is returned', () => {
          it('stores the new polled data', () => {
            mount({ meta: { page: { total_results: 1 } } });
            jest.spyOn(ApiLogsLogic.actions, 'storePolledData');

            ApiLogsLogic.actions.onPollInterval(MOCK_API_RESPONSE);

            expect(ApiLogsLogic.actions.storePolledData).toHaveBeenCalledWith(MOCK_API_RESPONSE);
          });
        });

        describe('when the same data is returned', () => {
          it('does nothing', () => {
            mount({ meta: { page: { total_results: 100 } } });
            jest.spyOn(ApiLogsLogic.actions, 'updateView');
            jest.spyOn(ApiLogsLogic.actions, 'storePolledData');

            ApiLogsLogic.actions.onPollInterval(MOCK_API_RESPONSE);

            expect(ApiLogsLogic.actions.updateView).not.toHaveBeenCalled();
            expect(ApiLogsLogic.actions.storePolledData).not.toHaveBeenCalled();
          });
        });
      });
    });

    describe('onUserRefresh', () => {
      it('updates the apiLogs data with the stored polled data', () => {
        mount({ apiLogs: [], polledData: MOCK_API_RESPONSE });

        ApiLogsLogic.actions.onUserRefresh();

        expect(ApiLogsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          apiLogs: MOCK_API_RESPONSE.results,
          meta: MOCK_API_RESPONSE.meta,
          polledData: MOCK_API_RESPONSE,
          dataLoading: false,
        });
      });
    });
  });

  describe('events', () => {
    describe('unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      it('clears the poll interval', () => {
        mount({ intervalId: 123 });
        unmount();
        expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      });

      it('does not clearInterval if a poll has not been started', () => {
        mount({ intervalId: null });
        unmount();
        expect(clearIntervalSpy).not.toHaveBeenCalled();
      });
    });
  });
});
