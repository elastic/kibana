/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject } from 'rxjs';
import { coreMock } from '../../../../../src/core/public/mocks';
import { EnhancedSearchInterceptor } from './search_interceptor';
import { CoreStart } from 'kibana/public';

jest.useFakeTimers();

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
const mockSearch = jest.fn();
let searchInterceptor: EnhancedSearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

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
    test('should prevent the request from timing out', () => {
      const mockResponse = new Subject();
      const response = searchInterceptor.search({});

      setTimeout(searchInterceptor.runBeyondTimeout, 500);
      setTimeout(() => mockResponse.next('hi'), 250);
      setTimeout(() => mockResponse.complete(), 2000);

      const next = jest.fn();
      const complete = jest.fn();
      const error = jest.fn();
      response.subscribe({ next, error, complete });

      jest.advanceTimersByTime(2000);

      expect(next).toHaveBeenCalledWith('hi');
      expect(error).not.toHaveBeenCalled();
      expect(complete).toHaveBeenCalled();
    });
  });
});
