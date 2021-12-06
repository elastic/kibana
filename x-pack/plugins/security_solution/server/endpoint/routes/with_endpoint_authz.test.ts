/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { RequestHandler } from 'kibana/server';
import { requestContextMock } from '../../lib/detection_engine/routes/__mocks__';

describe('When using `withEndpointAuthz()`', () => {
  let mockRequestHandler: jest.Mocked<RequestHandler>;
  let mockContext: jest.Mocked<ReturnType<typeof requestContextMock.create>>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    mockRequestHandler = jest.fn(async (_context, _request, response) => {
      return response.ok();
    });
    mockContext = requestContextMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockRequest = httpServerMock.createKibanaRequest();
  });

  it.todo('should turn off authz validation when using %j');

  it.todo('should allow if `all` authz are granted');

  it.todo('should forbid if any of the `all` authz is not granted');

  it.todo('should allow if at least one in the `any` list of authz is granted');

  it.todo('should forbid if none in the `any` list of authz is granted');

  it.todo('should forbid if `all` is allowed, but none in the `any` list is granted');
});
