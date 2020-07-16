/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import { registerLimitedConcurrencyRoutes } from './limited_concurrency';
import { IngestManagerConfigType } from '../index';

describe('registerLimitedConcurrencyRoutes', () => {
  test(`doesn't call registerOnPreAuth if maxConcurrentConnections is 0`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 0 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).not.toHaveBeenCalled();
  });

  test(`calls registerOnPreAuth once if maxConcurrentConnections is 1`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 1 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).toHaveBeenCalledTimes(1);
  });

  test(`calls registerOnPreAuth once if maxConcurrentConnections is 1000`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 1000 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).toHaveBeenCalledTimes(1);
  });
});

describe('preAuthHandler', () => {
  test(`it ignores routes which don't have the correct tag`, async () => {
    const routerMock = coreMock.createSetup().http.createRouter();
    const handlerMock = jest.fn();
    routerMock.get(
      {
        path: '/api/foo',
        validate: false,
        // options: { tags: ['ingest:limited-concurrency'] },
      },
      handlerMock
    );

    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 1 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    const [[preAuthHandler]] = mockSetup.http.registerOnPreAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/api/foo',
      // routeTags: ['ingest:limited-concurrency'],
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPreAuthToolkit = httpServiceMock.createOnPreAuthToolkit();

    // @ts-ignore error re: mockPreAuthToolkit return type
    await preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit);
    const [routeConfig, routeHandler] = routerMock.get.mock.calls[0];
    // @ts-ignore error re: missing iterator
    // const [routeConfig, routeHandler] = routerMock.get.mock.calls.find(
    //   ([{ path }]) => path === '/api/foo'
    // );
    console.log({ routeConfig, routeHandler });
    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPreAuthToolkit.next).toHaveBeenCalledTimes(1);

    expect(handlerMock).toHaveBeenCalled();
  });

  // test(`it processes routes which have the correct tag`, async () => {
  //   const mockSetup = coreMock.createSetup();
  //   const mockConfig = { fleet: { maxConcurrentConnections: 1 } } as IngestManagerConfigType;
  //   registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

  //   const [[preAuthHandler]] = mockSetup.http.registerOnPreAuth.mock.calls;

  //   const mockRequest = httpServerMock.createKibanaRequest({
  //     method: 'get',
  //     path: '/api/foo',
  //     routeTags: ['ingest:limited-concurrency'],
  //   });
  //   const mockResponse = httpServerMock.createResponseFactory();
  //   const mockPreAuthToolkit = httpServiceMock.createOnPreAuthToolkit();

  //   const responses = await Promise.all([
  //     preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit),
  //     preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit),
  //     preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit),
  //     preAuthHandler(mockRequest, mockResponse, mockPreAuthToolkit),
  //   ]);
  //   console.log('first res', responses[0]);
  //   console.log('last res', responses[3]);
  //   expect(mockResponse.notFound).not.toHaveBeenCalled();
  //   expect(mockPreAuthToolkit.next).toHaveBeenCalledTimes(1);
  // });
});
