/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject } from 'rxjs';
import { coreMock } from '../../../../../src/core/public/mocks';
import { IKibanaSearchRequest, RequestTimeoutError } from '../../../../../src/plugins/data/public';
import { EnhancedSearchInterceptor } from './search_interceptor';
import { CoreStart } from 'kibana/public';

jest.useFakeTimers();

const flushPromises = () => new Promise(resolve => setImmediate(resolve));
const mockSearch = jest.fn();
let searchInterceptor: EnhancedSearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

describe('EnhancedSearchInterceptor', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    mockSearch.mockClear();
    searchInterceptor = new EnhancedSearchInterceptor(
      mockCoreStart.notifications.toasts,
      mockCoreStart.application,
      1000
    );
  });

  describe('search', () => {
    test('should invoke `search` with the request', () => {
      mockSearch.mockReturnValue(new Observable());
      const mockRequest: IKibanaSearchRequest = {};
      searchInterceptor.search(mockSearch, mockRequest);
      expect(mockSearch.mock.calls[0][0]).toBe(mockRequest);
    });

    test('should mirror the observable to completion if the request does not time out', () => {
      const mockResponse = new Subject();
      mockSearch.mockReturnValue(mockResponse.asObservable());
      const response = searchInterceptor.search(mockSearch, {});

      setTimeout(() => mockResponse.next('hi'), 250);
      setTimeout(() => mockResponse.complete(), 500);

      const next = jest.fn();
      const complete = jest.fn();
      response.subscribe({ next, complete });

      jest.advanceTimersByTime(1000);

      expect(next).toHaveBeenCalledWith('hi');
      expect(complete).toHaveBeenCalled();
    });

    test('should mirror the observable to error if the request does not time out', () => {
      const mockResponse = new Subject();
      mockSearch.mockReturnValue(mockResponse.asObservable());
      const response = searchInterceptor.search(mockSearch, {});

      setTimeout(() => mockResponse.next('hi'), 250);
      setTimeout(() => mockResponse.error('error'), 500);

      const next = jest.fn();
      const error = jest.fn();
      response.subscribe({ next, error });

      jest.advanceTimersByTime(1000);

      expect(next).toHaveBeenCalledWith('hi');
      expect(error).toHaveBeenCalledWith('error');
    });

    test('should return a `RequestTimeoutError` if the request times out', () => {
      mockSearch.mockReturnValue(new Observable());
      const response = searchInterceptor.search(mockSearch, {});

      const error = jest.fn();
      response.subscribe({ error });

      jest.advanceTimersByTime(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0] instanceof RequestTimeoutError).toBe(true);
    });
  });

  describe('cancelPending', () => {
    test('should abort all pending requests', async () => {
      mockSearch.mockReturnValue(new Observable());

      searchInterceptor.search(mockSearch, {});
      searchInterceptor.search(mockSearch, {});
      searchInterceptor.cancelPending();

      await flushPromises();

      const areAllRequestsAborted = mockSearch.mock.calls.every(([, { signal }]) => signal.aborted);
      expect(areAllRequestsAborted).toBe(true);
    });
  });

  describe('runBeyondTimeout', () => {
    test('should prevent the request from timing out', () => {
      const mockResponse = new Subject();
      mockSearch.mockReturnValue(mockResponse.asObservable());
      const response = searchInterceptor.search(mockSearch, {});

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

  describe('getPendingCount$', () => {
    test('should observe the number of pending requests', () => {
      let i = 0;
      const mockResponses = [new Subject(), new Subject()];
      mockSearch.mockImplementation(() => mockResponses[i++]);

      const pendingCount$ = searchInterceptor.getPendingCount$();

      const next = jest.fn();
      pendingCount$.subscribe(next);

      const error = jest.fn();
      searchInterceptor.search(mockSearch, {}).subscribe({ error });
      searchInterceptor.search(mockSearch, {}).subscribe({ error });

      setTimeout(() => mockResponses[0].complete(), 250);
      setTimeout(() => mockResponses[1].error('error'), 500);

      jest.advanceTimersByTime(500);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls).toEqual([[0], [1], [2], [1], [0]]);
    });
  });
});
