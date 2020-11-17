/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { MockedKeys } from '@kbn/utility-types/jest';
import { coreMock } from '../../../../../src/core/public/mocks';
import { EnhancedSearchInterceptor } from './search_interceptor';
import { CoreSetup, CoreStart } from 'kibana/public';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../src/plugins/kibana_utils/public';
import { SearchTimeoutError } from 'src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { bfetchPluginMock } from '../../../../../src/plugins/bfetch/public/mocks';

const timeTravel = (msToRun = 0) => {
  jest.advanceTimersByTime(msToRun);
  return new Promise((resolve) => setImmediate(resolve));
};

const next = jest.fn();
const error = jest.fn();
const complete = jest.fn();

let searchInterceptor: EnhancedSearchInterceptor;
let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let fetchMock: jest.Mock<any>;

jest.useFakeTimers();

function mockFetchImplementation(responses: any[]) {
  let i = 0;
  fetchMock.mockImplementation(() => {
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
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    const dataPluginMockStart = dataPluginMock.createStartContract();
    fetchMock = jest.fn();

    mockCoreSetup.uiSettings.get.mockImplementation((name: string) => {
      switch (name) {
        case UI_SETTINGS.SEARCH_TIMEOUT:
          return 1000;
        default:
          return;
      }
    });

    next.mockClear();
    error.mockClear();
    complete.mockClear();
    jest.clearAllTimers();

    mockUsageCollector = {
      trackQueryTimedOut: jest.fn(),
      trackQueriesCancelled: jest.fn(),
    };

    const mockPromise = new Promise((resolve) => {
      resolve([
        {
          application: mockCoreStart.application,
        },
      ]);
    });

    const bfetchMock = bfetchPluginMock.createSetupContract();
    bfetchMock.batchedFunction.mockReturnValue(fetchMock);

    searchInterceptor = new EnhancedSearchInterceptor({
      bfetch: bfetchMock,
      toasts: mockCoreSetup.notifications.toasts,
      startServices: mockPromise as any,
      http: mockCoreSetup.http,
      uiSettings: mockCoreSetup.uiSettings,
      usageCollector: mockUsageCollector,
      session: dataPluginMockStart.search.session,
    });
  });

  describe('search', () => {
    test('should resolve immediately if first call returns full result', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: false,
            isRunning: false,
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
            isPartial: false,
            isRunning: true,
            id: 1,
            rawResponse: {
              took: 1,
            },
          },
        },
        {
          time: 20,
          value: {
            isPartial: false,
            isRunning: false,
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
            isPartial: true,
            isRunning: false,
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
            isPartial: false,
            isRunning: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      abortController.abort();

      const response = searchInterceptor.search({}, { abortSignal: abortController.signal });
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
            isPartial: false,
            isRunning: true,
            id: 1,
          },
        },
        {
          time: 300,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 250);

      const response = searchInterceptor.search(
        {},
        { abortSignal: abortController.signal, pollInterval: 0 }
      );
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      await timeTravel(240);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalled();
    });

    test('should not DELETE a running async search on async timeout prior to first response', async () => {
      const responses = [
        {
          time: 2000,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
          },
        },
      ];
      mockFetchImplementation(responses);

      const response = searchInterceptor.search({}, { pollInterval: 0 });
      response.subscribe({ next, error });

      await timeTravel(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(SearchTimeoutError);
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();
    });

    test('should DELETE a running async search on async timeout after first response', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: false,
            isRunning: true,
            id: 1,
          },
        },
        {
          time: 2000,
          value: {
            isPartial: false,
            isRunning: false,
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
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(SearchTimeoutError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalled();
    });

    test('should DELETE a running async search on async timeout on error from fetch', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: false,
            isRunning: true,
            id: 1,
          },
        },
        {
          time: 10,
          value: {
            error: 'oh no',
            isPartial: false,
            isRunning: false,
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
      expect(fetchMock).toHaveBeenCalled();
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();

      // Long enough to reach the timeout but not long enough to reach the next response
      await timeTravel(10);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBe(responses[1].value);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalled();
    });
  });

  describe('cancelPending', () => {
    test('should abort all pending requests', async () => {
      mockFetchImplementation([
        {
          time: 10,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
          },
        },
        {
          time: 20,
          value: {
            isPartial: false,
            isRunning: false,
            id: 1,
          },
        },
      ]);

      searchInterceptor.search({}).subscribe({ next, error });
      searchInterceptor.search({}).subscribe({ next, error });
      searchInterceptor.cancelPending();

      await timeTravel();

      const areAllRequestsAborted = fetchMock.mock.calls.every((callArgs) => callArgs[1]?.aborted);
      expect(areAllRequestsAborted).toBe(true);
      expect(mockUsageCollector.trackQueriesCancelled).toBeCalledTimes(1);
    });
  });
});
