/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../src/core/public/mocks';
import { EnhancedSearchInterceptor } from './search_interceptor';
import { CoreStart } from 'kibana/public';
import { AbortError } from '../../../../../src/plugins/data/common';

const timeTravel = (msToRun = 0) => {
  jest.advanceTimersByTime(msToRun);
  return new Promise((resolve) => setImmediate(resolve));
};

const next = jest.fn();
const error = jest.fn();
const complete = jest.fn();

let searchInterceptor: EnhancedSearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

jest.useFakeTimers();

function mockFetchImplementation(responses: any[]) {
  let i = 0;
  mockCoreStart.http.fetch.mockImplementation(() => {
    const { time = 0, value = {}, isError = false } = responses[i++];
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        return (isError ? reject : resolve)(value);
      }, time)
    );
  });
}

describe('EnhancedSearchInterceptor', () => {
  let mockUsageCollector: any;

  beforeEach(() => {
    mockCoreStart = coreMock.createStart();

    next.mockClear();
    error.mockClear();
    complete.mockClear();
    jest.clearAllTimers();

    mockUsageCollector = {
      trackQueryTimedOut: jest.fn(),
      trackQueriesCancelled: jest.fn(),
      trackLongQueryPopupShown: jest.fn(),
      trackLongQueryDialogDismissed: jest.fn(),
      trackLongQueryRunBeyondTimeout: jest.fn(),
      trackError: jest.fn(),
      trackSuccess: jest.fn(),
    };

    searchInterceptor = new EnhancedSearchInterceptor(
      {
        toasts: mockCoreStart.notifications.toasts,
        application: mockCoreStart.application,
        http: mockCoreStart.http,
        uiSettings: mockCoreStart.uiSettings,
        usageCollector: mockUsageCollector,
      },
      1000
    );
  });

  describe('search', () => {
    test('should resolve immediately if first call returns full result', async () => {
      const responses = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({});
      response.subscribe({ next, error, complete });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(responses[0].value);
      expect(complete).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    test('should make secondary request if first call returns partial result', async () => {
      const responses = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: true,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
        {
          time: 20,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error, complete });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(responses[0].value);
      expect(complete).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      await timeTravel(20);

      expect(next).toHaveBeenCalledTimes(2);
      expect(next.mock.calls[1][0]).toStrictEqual(responses[1].value);
      expect(complete).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    test('should abort if request is partial and not running (ES graceful error)', async () => {
      const responses = [
        {
          time: 10,
          value: {
            is_partial: true,
            is_running: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({});
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(responses[0].value);
      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
    });

    test('should abort on user abort', async () => {
      const responses = [
        {
          time: 500,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      abortController.abort();

      const response = searchInterceptor.search({}, { signal: abortController.signal });
      response.subscribe({ next, error });

      await timeTravel(500);

      expect(next).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
    });

    test('should DELETE a running async search on abort', async () => {
      const responses = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: true,
            id: 1,
          },
        },
        {
          time: 300,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 250);

      const response = searchInterceptor.search(
        {},
        { signal: abortController.signal, pollInterval: 0 }
      );
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      await timeTravel(240);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);

      expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(2);
      expect(mockCoreStart.http.delete).toHaveBeenCalled();
    });

    test('should not DELETE a running async search on async timeout prior to first response', async () => {
      const responses = [
        {
          time: 2000,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
      expect(mockCoreStart.http.fetch).toHaveBeenCalled();
      expect(mockCoreStart.http.delete).not.toHaveBeenCalled();
    });

    test('should DELETE a running async search on async timeout after first response', async () => {
      const responses = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: true,
            id: 1,
          },
        },
        {
          time: 2000,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(mockCoreStart.http.fetch).toHaveBeenCalled();
      expect(mockCoreStart.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
      expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(2);
      expect(mockCoreStart.http.delete).toHaveBeenCalled();
    });

    test('should DELETE a running async search on async timeout on error from fetch', async () => {
      const responses = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: true,
            id: 1,
          },
        },
        {
          time: 10,
          value: {
            error: 'oh no',
            is_partial: false,
            is_running: false,
            id: 1,
          },
          isError: true,
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(mockCoreStart.http.fetch).toHaveBeenCalled();
      expect(mockCoreStart.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(10);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBe(responses[1].value);
      expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(2);
      expect(mockCoreStart.http.delete).toHaveBeenCalled();
    });
  });

  describe('cancelPending', () => {
    test('should abort all pending requests', async () => {
      mockFetchImplementation([
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
        {
          time: 20,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ]);

      searchInterceptor.search({}).subscribe({ next, error });
      searchInterceptor.search({}).subscribe({ next, error });
      searchInterceptor.cancelPending();

      await timeTravel();

      const areAllRequestsAborted = mockCoreStart.http.fetch.mock.calls.every(
        ([{ signal }]) => signal?.aborted
      );
      expect(areAllRequestsAborted).toBe(true);
      expect(mockUsageCollector.trackQueriesCancelled).toBeCalledTimes(1);
    });
  });

  describe('runBeyondTimeout', () => {
    const timedResponses = [
      {
        time: 250,
        value: {
          is_partial: true,
          is_running: true,
          id: 1,
          rawResponse: {
            took: 1,
          },
        },
      },
      {
        time: 2000,
        value: {
          is_partial: false,
          is_running: false,
          id: 1,
          rawResponse: {
            took: 1,
          },
        },
      },
    ];

    test('times out if runBeyondTimeout is not called', async () => {
      mockFetchImplementation(timedResponses);

      const response = searchInterceptor.search({});
      response.subscribe({ next, error });

      await timeTravel(250);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);

      await timeTravel(750);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
    });

    test('times out if runBeyondTimeout is called too late', async () => {
      mockFetchImplementation(timedResponses);

      const response = searchInterceptor.search({});
      response.subscribe({ next, error });
      setTimeout(() => searchInterceptor.runBeyondTimeout(), 1100);

      await timeTravel(250);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);

      await timeTravel(750);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
    });

    test('should prevent the request from timing out', async () => {
      mockFetchImplementation(timedResponses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error, complete });
      setTimeout(() => searchInterceptor.runBeyondTimeout(), 500);

      await timeTravel(250);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);

      await timeTravel(250); // Run beyond timeout
      await timeTravel(1750); // Final response

      expect(next).toHaveBeenCalledTimes(2);
      expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);
      expect(next.mock.calls[1][0]).toStrictEqual(timedResponses[1].value);
      expect(error).not.toHaveBeenCalled();
      expect(mockUsageCollector.trackLongQueryRunBeyondTimeout).toBeCalledTimes(1);
      expect(mockUsageCollector.trackSuccess).toBeCalledTimes(1);
    });
  });
});
