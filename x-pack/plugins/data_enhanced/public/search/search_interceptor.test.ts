/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { coreMock } from '../../../../../src/core/public/mocks';
import { EnhancedSearchInterceptor } from './search_interceptor';
import { CoreSetup, CoreStart } from 'kibana/public';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../src/plugins/kibana_utils/public';
import {
  ISessionService,
  SearchTimeoutError,
  SearchSessionState,
  PainlessError,
} from 'src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { bfetchPluginMock } from '../../../../../src/plugins/bfetch/public/mocks';
import { BehaviorSubject } from 'rxjs';
import * as xpackResourceNotFoundException from '../../common/search/test_data/search_phase_execution_exception.json';

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
  let sessionService: jest.Mocked<ISessionService>;
  let sessionState$: BehaviorSubject<SearchSessionState>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    sessionState$ = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);
    const dataPluginMockStart = dataPluginMock.createStartContract();
    sessionService = {
      ...(dataPluginMockStart.search.session as jest.Mocked<ISessionService>),
      state$: sessionState$,
    };
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
      session: sessionService,
    });
  });

  describe('errors', () => {
    test('Should throw Painless error on server error with OSS format', async () => {
      const mockResponse: any = {
        statusCode: 400,
        message: 'search_phase_execution_exception',
        attributes: xpackResourceNotFoundException.error,
      };
      fetchMock.mockRejectedValueOnce(mockResponse);
      const response = searchInterceptor.search({
        params: {},
      });
      await expect(response.toPromise()).rejects.toThrow(PainlessError);
    });

    test('Renders a PainlessError', async () => {
      searchInterceptor.showError(
        new PainlessError({
          statusCode: 400,
          message: 'search_phase_execution_exception',
          attributes: xpackResourceNotFoundException.error,
        })
      );
      expect(mockCoreSetup.notifications.toasts.addDanger).toBeCalledTimes(1);
      expect(mockCoreSetup.notifications.toasts.addError).not.toBeCalled();
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
            isPartial: true,
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

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
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
            isPartial: true,
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
      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
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
            isPartial: true,
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
      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
    });

    test('should DELETE a running async search on async timeout on error from fetch', async () => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
            isRunning: true,
            id: 1,
          },
        },
        {
          time: 10,
          value: {
            statusCode: 500,
            message: 'oh no',
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
      expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((error.mock.calls[0][0] as Error).message).toBe('oh no');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).toHaveBeenCalledTimes(1);
    });

    test('should NOT DELETE a running SAVED async search on abort', async () => {
      const sessionId = 'sessionId';
      sessionService.isCurrentSession.mockImplementation((_sessionId) => _sessionId === sessionId);
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
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
        { abortSignal: abortController.signal, pollInterval: 0, sessionId }
      );
      response.subscribe({ next, error });

      await timeTravel(10);

      expect(next).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();

      sessionState$.next(SearchSessionState.BackgroundLoading);

      await timeTravel(240);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockCoreSetup.http.delete).not.toHaveBeenCalled();
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

      const areAllRequestsAborted = fetchMock.mock.calls.every(([_, signal]) => signal?.aborted);
      expect(areAllRequestsAborted).toBe(true);
      expect(mockUsageCollector.trackQueriesCancelled).toBeCalledTimes(1);
    });
  });

  describe('session', () => {
    beforeEach(() => {
      const responses = [
        {
          time: 10,
          value: {
            isPartial: true,
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
    });

    test('should track searches', async () => {
      const sessionId = 'sessionId';
      sessionService.isCurrentSession.mockImplementation((_sessionId) => _sessionId === sessionId);
      sessionService.getSessionId.mockImplementation(() => sessionId);

      const untrack = jest.fn();
      sessionService.trackSearch.mockImplementation(() => untrack);

      const response = searchInterceptor.search({}, { pollInterval: 0, sessionId });
      response.subscribe({ next, error });
      await timeTravel(10);
      expect(sessionService.trackSearch).toBeCalledTimes(1);
      expect(untrack).not.toBeCalled();
      await timeTravel(300);
      expect(sessionService.trackSearch).toBeCalledTimes(1);
      expect(untrack).toBeCalledTimes(1);
    });

    test('session service should be able to cancel search', async () => {
      const sessionId = 'sessionId';
      sessionService.isCurrentSession.mockImplementation((_sessionId) => _sessionId === sessionId);
      sessionService.getSessionId.mockImplementation(() => sessionId);

      const untrack = jest.fn();
      sessionService.trackSearch.mockImplementation(() => untrack);

      const response = searchInterceptor.search({}, { pollInterval: 0, sessionId });
      response.subscribe({ next, error });
      await timeTravel(10);
      expect(sessionService.trackSearch).toBeCalledTimes(1);

      const abort = sessionService.trackSearch.mock.calls[0][0].abort;
      expect(abort).toBeInstanceOf(Function);

      abort();

      await timeTravel(10);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0]).toBeInstanceOf(AbortError);
    });

    test("don't track non current session searches", async () => {
      const sessionId = 'sessionId';
      sessionService.isCurrentSession.mockImplementation((_sessionId) => _sessionId === sessionId);
      sessionService.getSessionId.mockImplementation(() => sessionId);

      const untrack = jest.fn();
      sessionService.trackSearch.mockImplementation(() => untrack);

      const response1 = searchInterceptor.search(
        {},
        { pollInterval: 0, sessionId: 'something different' }
      );
      response1.subscribe({ next, error });

      const response2 = searchInterceptor.search({}, { pollInterval: 0, sessionId: undefined });
      response2.subscribe({ next, error });

      await timeTravel(10);
      expect(sessionService.trackSearch).toBeCalledTimes(0);
    });

    test("don't track if no current session", async () => {
      sessionService.getSessionId.mockImplementation(() => undefined);
      sessionService.isCurrentSession.mockImplementation((_sessionId) => false);

      const untrack = jest.fn();
      sessionService.trackSearch.mockImplementation(() => untrack);

      const response1 = searchInterceptor.search(
        {},
        { pollInterval: 0, sessionId: 'something different' }
      );
      response1.subscribe({ next, error });

      const response2 = searchInterceptor.search({}, { pollInterval: 0, sessionId: undefined });
      response2.subscribe({ next, error });

      await timeTravel(10);
      expect(sessionService.trackSearch).toBeCalledTimes(0);
    });
  });
});
