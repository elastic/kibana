/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
  expectedAsyncError,
} from '../../../__mocks__';

jest.mock('../engine', () => ({
  EngineLogic: { values: { engineName: 'some-engine' } },
}));

import { EngineOverviewLogic } from './';

describe('EngineOverviewLogic', () => {
  const { mount, unmount } = new LogicMounter(EngineOverviewLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const mockEngineMetrics = {
    apiLogsUnavailable: true,
    documentCount: 10,
    startDate: '1970-01-30',
    operationsPerDay: [0, 0, 0, 0, 0, 0, 0],
    queriesPerDay: [0, 0, 0, 0, 0, 25, 50],
    totalClicks: 50,
    totalQueries: 75,
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    apiLogsUnavailable: false,
    documentCount: 0,
    startDate: '',
    operationsPerDay: [],
    queriesPerDay: [],
    totalClicks: 0,
    totalQueries: 0,
    timeoutId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(EngineOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setPolledData', () => {
      it('should set all received data as top-level values and set dataLoading to false', () => {
        mount();
        EngineOverviewLogic.actions.setPolledData(mockEngineMetrics);

        expect(EngineOverviewLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ...mockEngineMetrics,
          dataLoading: false,
        });
      });
    });

    describe('setTimeoutId', () => {
      describe('timeoutId', () => {
        it('should be set to the provided value', () => {
          mount();
          EngineOverviewLogic.actions.setTimeoutId(123);

          expect(EngineOverviewLogic.values).toEqual({
            ...DEFAULT_VALUES,
            timeoutId: 123,
          });
        });
      });
    });

    describe('pollForOverviewMetrics', () => {
      it('fetches data and calls onPollingSuccess', async () => {
        mount();
        jest.spyOn(EngineOverviewLogic.actions, 'onPollingSuccess');
        const promise = Promise.resolve(mockEngineMetrics);
        http.get.mockReturnValueOnce(promise);

        EngineOverviewLogic.actions.pollForOverviewMetrics();
        await promise;

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/overview');
        expect(EngineOverviewLogic.actions.onPollingSuccess).toHaveBeenCalledWith(
          mockEngineMetrics
        );
      });

      it('handles errors', async () => {
        mount();
        const promise = Promise.reject('An error occurred');
        http.get.mockReturnValue(promise);

        EngineOverviewLogic.actions.pollForOverviewMetrics();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('An error occurred');
      });
    });

    describe('onPollingSuccess', () => {
      it('starts a polling timeout and sets data', async () => {
        mount();
        jest.useFakeTimers();
        jest.spyOn(EngineOverviewLogic.actions, 'setTimeoutId');
        jest.spyOn(EngineOverviewLogic.actions, 'setPolledData');

        EngineOverviewLogic.actions.onPollingSuccess(mockEngineMetrics);

        expect(setTimeout).toHaveBeenCalledWith(
          EngineOverviewLogic.actions.pollForOverviewMetrics,
          5000
        );
        expect(EngineOverviewLogic.actions.setTimeoutId).toHaveBeenCalledWith(expect.any(Number));
        expect(EngineOverviewLogic.actions.setPolledData).toHaveBeenCalledWith(mockEngineMetrics);
      });
    });
  });

  describe('unmount', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mount();
    });

    it('clears existing polling timeouts on unmount', () => {
      EngineOverviewLogic.actions.setTimeoutId(123);
      unmount();
      expect(clearTimeout).toHaveBeenCalled();
    });

    it("does not clear timeout if one hasn't been set", () => {
      unmount();
      expect(clearTimeout).not.toHaveBeenCalled();
    });
  });
});
