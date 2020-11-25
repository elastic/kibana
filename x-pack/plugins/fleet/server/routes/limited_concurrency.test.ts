/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import {
  createLimitedPreAuthHandler,
  isLimitedRoute,
  registerLimitedConcurrencyRoutes,
} from './limited_concurrency';
import { IngestManagerConfigType } from '../index';

describe('registerLimitedConcurrencyRoutes', () => {
  test(`doesn't call registerOnPreAuth if maxConcurrentConnections is 0`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { agents: { maxConcurrentConnections: 0 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).not.toHaveBeenCalled();
  });

  test(`calls registerOnPreAuth once if maxConcurrentConnections is 1`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { agents: { maxConcurrentConnections: 1 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).toHaveBeenCalledTimes(1);
  });

  test(`calls registerOnPreAuth once if maxConcurrentConnections is 1000`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { agents: { maxConcurrentConnections: 1000 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).toHaveBeenCalledTimes(1);
  });
});

// assertions for calls to .decrease are commented out because it's called on the
// "req.events.completed$ observable (which) will never emit from a mocked request in a jest unit test environment"
// https://github.com/elastic/kibana/pull/72338#issuecomment-661908791
describe('preAuthHandler', () => {
  test(`ignores routes when !isMatch`, async () => {
    const mockMaxCounter = {
      increase: jest.fn(),
      decrease: jest.fn(),
      lessThanMax: jest.fn(),
    };
    const preAuthHandler = createLimitedPreAuthHandler({
      isMatch: jest.fn().mockImplementation(() => false),
      maxCounter: mockMaxCounter,
    });

    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/no/match',
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPreAuthToolkit = httpServiceMock.createOnPreAuthToolkit();

    await preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit);

    expect(mockMaxCounter.increase).not.toHaveBeenCalled();
    expect(mockMaxCounter.decrease).not.toHaveBeenCalled();
    expect(mockMaxCounter.lessThanMax).not.toHaveBeenCalled();
    expect(mockPreAuthToolkit.next).toHaveBeenCalledTimes(1);
  });

  test(`ignores routes which don't have the correct tag`, async () => {
    const mockMaxCounter = {
      increase: jest.fn(),
      decrease: jest.fn(),
      lessThanMax: jest.fn(),
    };
    const preAuthHandler = createLimitedPreAuthHandler({
      isMatch: isLimitedRoute,
      maxCounter: mockMaxCounter,
    });

    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/no/match',
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPreAuthToolkit = httpServiceMock.createOnPreAuthToolkit();

    await preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit);

    expect(mockMaxCounter.increase).not.toHaveBeenCalled();
    expect(mockMaxCounter.decrease).not.toHaveBeenCalled();
    expect(mockMaxCounter.lessThanMax).not.toHaveBeenCalled();
    expect(mockPreAuthToolkit.next).toHaveBeenCalledTimes(1);
  });

  test(`processes routes which have the correct tag`, async () => {
    const mockMaxCounter = {
      increase: jest.fn(),
      decrease: jest.fn(),
      lessThanMax: jest.fn().mockImplementation(() => true),
    };
    const preAuthHandler = createLimitedPreAuthHandler({
      isMatch: isLimitedRoute,
      maxCounter: mockMaxCounter,
    });

    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/should/match',
      routeTags: ['ingest:limited-concurrency'],
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPreAuthToolkit = httpServiceMock.createOnPreAuthToolkit();

    await preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit);

    // will call lessThanMax because isMatch succeeds
    expect(mockMaxCounter.lessThanMax).toHaveBeenCalledTimes(1);
    // will not error because lessThanMax is true
    expect(mockResponse.customError).not.toHaveBeenCalled();
    expect(mockPreAuthToolkit.next).toHaveBeenCalledTimes(1);
  });

  test(`updates the counter when isMatch & lessThanMax`, async () => {
    const mockMaxCounter = {
      increase: jest.fn(),
      decrease: jest.fn(),
      lessThanMax: jest.fn().mockImplementation(() => true),
    };
    const preAuthHandler = createLimitedPreAuthHandler({
      isMatch: jest.fn().mockImplementation(() => true),
      maxCounter: mockMaxCounter,
    });

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPreAuthToolkit = httpServiceMock.createOnPreAuthToolkit();

    await preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit);

    expect(mockMaxCounter.increase).toHaveBeenCalled();
    // expect(mockMaxCounter.decrease).toHaveBeenCalled();
    expect(mockPreAuthToolkit.next).toHaveBeenCalledTimes(1);
  });

  test(`lessThanMax ? next : error`, async () => {
    const mockMaxCounter = {
      increase: jest.fn(),
      decrease: jest.fn(),
      lessThanMax: jest
        .fn()
        // call 1
        .mockImplementationOnce(() => true)
        // calls 2, 3, 4
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        // calls 5+
        .mockImplementationOnce(() => true)
        .mockImplementation(() => true),
    };

    const preAuthHandler = createLimitedPreAuthHandler({
      isMatch: isLimitedRoute,
      maxCounter: mockMaxCounter,
    });

    function makeRequestExpectNext() {
      const request = httpServerMock.createKibanaRequest({
        path: '/should/match/',
        routeTags: ['ingest:limited-concurrency'],
      });
      const response = httpServerMock.createResponseFactory();
      const toolkit = httpServiceMock.createOnPreAuthToolkit();

      preAuthHandler(request, response, toolkit);
      expect(toolkit.next).toHaveBeenCalledTimes(1);
      expect(response.customError).not.toHaveBeenCalled();
    }

    function makeRequestExpectError() {
      const request = httpServerMock.createKibanaRequest({
        path: '/should/match/',
        routeTags: ['ingest:limited-concurrency'],
      });
      const response = httpServerMock.createResponseFactory();
      const toolkit = httpServiceMock.createOnPreAuthToolkit();

      preAuthHandler(request, response, toolkit);
      expect(toolkit.next).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: 'Too Many Requests',
      });
    }

    // request 1 succeeds
    makeRequestExpectNext();
    expect(mockMaxCounter.increase).toHaveBeenCalledTimes(1);
    // expect(mockMaxCounter.decrease).toHaveBeenCalledTimes(1);

    // requests 2, 3, 4 fail
    makeRequestExpectError();
    makeRequestExpectError();
    makeRequestExpectError();

    // requests 5+ succeed
    makeRequestExpectNext();
    expect(mockMaxCounter.increase).toHaveBeenCalledTimes(2);
    // expect(mockMaxCounter.decrease).toHaveBeenCalledTimes(2);

    makeRequestExpectNext();
    expect(mockMaxCounter.increase).toHaveBeenCalledTimes(3);
    // expect(mockMaxCounter.decrease).toHaveBeenCalledTimes(3);

    makeRequestExpectNext();
    expect(mockMaxCounter.increase).toHaveBeenCalledTimes(4);
    // expect(mockMaxCounter.decrease).toHaveBeenCalledTimes(4);
  });
});
