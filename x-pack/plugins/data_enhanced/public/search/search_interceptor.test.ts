/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { coreMock } from '../../../../../src/core/public/mocks';
import { EnhancedSearchInterceptor } from './search_interceptor';
import { CoreStart, HttpFetchOptionsWithPath } from 'kibana/public';
import { AbortError } from '../../../../../src/plugins/data/common';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
const mockSearch = jest.fn();
let searchInterceptor: EnhancedSearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

function mockFetchImplementation(responses: any[]) {
  let i = 0;
  mockCoreStart.http.fetch.mockImplementation((options: HttpFetchOptionsWithPath) => {
    const res = new Promise((resolve, reject) => {
      const curIteration = i;
      const abortHandler = () => {
        clearTimeout(to);
        reject(new AbortError());
      };
      if (options.signal) options.signal.addEventListener('abort', abortHandler);
      const to = setTimeout(() => {
        if (options.signal) options.signal.removeEventListener('abort', abortHandler);
        resolve(responses[curIteration].value);
      }, responses[curIteration].time);
    });
    res.finally(() => {
      i++;
    });
    return res;
  });
}

describe('EnhancedSearchInterceptor', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    mockSearch.mockClear();
    searchInterceptor = new EnhancedSearchInterceptor(
      {
        toasts: mockCoreStart.notifications.toasts,
        application: mockCoreStart.application,
        http: mockCoreStart.http,
        uiSettings: mockCoreStart.uiSettings,
      },
      1000
    );
  });

  describe('search', () => {
    test('should resolve immediatelly if first call returns full result', async (done) => {
      const finalResponse = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ];

      mockFetchImplementation(finalResponse);

      const response = searchInterceptor.search({});

      const next = jest.fn();
      const error = jest.fn();
      const complete = () => {
        expect(next.mock.calls[0][0]).toStrictEqual(finalResponse[0].value);
        expect(next).toHaveBeenCalledTimes(1);
        expect(error).not.toHaveBeenCalled();
        expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(1);
        done();
      };
      response.subscribe({ next, error, complete });
    });

    test('should make secondary request if first call returns partial result', async (done) => {
      const finalResponse = [
        {
          time: 10,
          value: {
            is_partial: false,
            is_running: true,
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
      ];

      mockFetchImplementation(finalResponse);

      const response = searchInterceptor.search({}, { pollInterval: 20 });

      const next = jest.fn();
      const error = jest.fn();
      const complete = () => {
        expect(next.mock.calls[0][0]).toStrictEqual(finalResponse[0].value);
        expect(next.mock.calls[1][0]).toStrictEqual(finalResponse[1].value);
        expect(next).toHaveBeenCalledTimes(2);
        expect(error).not.toHaveBeenCalled();
        expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(2);
        done();
      };
      response.subscribe({ next, error, complete });
    });

    test('should abort if request is partial and not running (ES graceful error)', async (done) => {
      const finalResponse = [
        {
          time: 10,
          value: {
            is_partial: true,
            is_running: false,
            id: 1,
          },
        },
      ];

      mockFetchImplementation(finalResponse);

      const response = searchInterceptor.search({});

      const next = jest.fn();
      const error = (e: any) => {
        expect(next.mock.calls[0][0]).toStrictEqual(finalResponse[0].value);
        expect(e).toBeInstanceOf(AbortError);
        expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(1);
        done();
      };
      response.subscribe({ next, error });
    });

    test('should abort on user abort', async (done) => {
      const finalResponse = [
        {
          time: 500,
          value: {
            is_partial: false,
            is_running: false,
            id: 1,
          },
        },
      ];

      mockFetchImplementation(finalResponse);

      const abortController = new AbortController();
      const response = searchInterceptor.search({}, { signal: abortController.signal });

      const next = jest.fn();
      const error = (e: any) => {
        expect(next).toHaveBeenCalledTimes(0);
        expect(e).toBeInstanceOf(AbortError);
        expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(1);
        done();
      };
      response.subscribe({ next, error });

      setTimeout(() => abortController.abort(), 250);
    });

    test('should DELETE a running async search on abort', async (done) => {
      const finalResponse = [
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

      mockFetchImplementation(finalResponse);

      const abortController = new AbortController();
      const response = searchInterceptor.search(
        {},
        { signal: abortController.signal, pollInterval: 10 }
      );

      const next = jest.fn();
      const error = (e: any) => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(e).toBeInstanceOf(AbortError);
        expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(2);
        expect(mockCoreStart.http.delete).toHaveBeenCalledTimes(1);
        done();
      };
      response.subscribe({ next, error });
      setTimeout(() => abortController.abort(), 250);
    });

    test('should DELETE a running async search on async timeout ', async (done) => {
      const finalResponse = [
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

      mockFetchImplementation(finalResponse);

      const response = searchInterceptor.search({}, { pollInterval: 1000 });

      const next = jest.fn();
      const error = (e: any) => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(e).toBeInstanceOf(AbortError);
        expect(mockCoreStart.http.fetch).toHaveBeenCalledTimes(1);
        expect(mockCoreStart.http.delete).toHaveBeenCalledTimes(1);
        done();
      };
      response.subscribe({ next, error });
    });
  });

  describe('cancelPending', () => {
    test('should abort all pending requests', async () => {
      mockSearch.mockReturnValue(new Observable());

      searchInterceptor.search({});
      searchInterceptor.search({});
      searchInterceptor.cancelPending();

      await flushPromises();

      const areAllRequestsAborted = mockSearch.mock.calls.every(([, { signal }]) => signal.aborted);
      expect(areAllRequestsAborted).toBe(true);
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

    test('times out if runBeyondTimeout is not called', async (done) => {
      const response = searchInterceptor.search({});

      mockFetchImplementation(timedResponses);

      const next = jest.fn();
      const error = () => {
        expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);
        expect(next).toBeCalledTimes(1);
        done();
      };
      response.subscribe({ next, error });
    });

    test('times out if runBeyondTimeout is called too late', async (done) => {
      const response = searchInterceptor.search({});

      mockFetchImplementation(timedResponses);

      const next = jest.fn();
      const error = () => {
        expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);
        expect(next).toBeCalledTimes(1);
        done();
      };
      response.subscribe({ next, error });

      setTimeout(() => searchInterceptor.runBeyondTimeout(), 1100);
    });

    test('should prevent the request from timing out', async (done) => {
      const response = searchInterceptor.search({});

      mockFetchImplementation(timedResponses);

      const next = jest.fn();
      const error = jest.fn();
      const complete = () => {
        expect(next.mock.calls[0][0]).toStrictEqual(timedResponses[0].value);
        expect(next.mock.calls[1][0]).toStrictEqual(timedResponses[1].value);
        expect(next).toHaveBeenCalledTimes(2);
        expect(error).not.toHaveBeenCalled();
        done();
      };
      response.subscribe({ next, error, complete });

      setTimeout(() => searchInterceptor.runBeyondTimeout(), 500);
    });
  });
});
