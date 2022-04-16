/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { RequestHandler } from '@kbn/core/server';
import { requestContextMock } from '../../lib/detection_engine/routes/__mocks__';
import { EndpointApiNeededAuthz, withEndpointAuthz } from './with_endpoint_authz';
import { EndpointAuthz } from '../../../common/endpoint/types/authz';
import { EndpointAuthorizationError } from '../errors';

describe('When using `withEndpointAuthz()`', () => {
  let mockRequestHandler: jest.Mocked<RequestHandler>;
  let mockContext: jest.Mocked<ReturnType<typeof requestContextMock.create>>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockRequestHandler = jest.fn(async (_context, _request, response) => {
      return response.ok();
    });
    mockContext = requestContextMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockRequest = httpServerMock.createKibanaRequest();
    logger = loggingSystemMock.createLogger();
  });

  it.each<EndpointApiNeededAuthz[]>([
    [{}],
    [{ all: undefined }],
    [{ all: [] }],
    [{ any: undefined }],
    [{ any: [] }],
    [{ all: undefined, any: undefined }],
    [{ all: [], any: [] }],
  ])('should turn off authz validation when using %j', (neededAuthz) => {
    withEndpointAuthz(neededAuthz, logger, mockRequestHandler);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Authorization disabled for API route:')
    );
  });

  it.each<[EndpointApiNeededAuthz, Partial<EndpointAuthz>]>([
    [{ all: ['canAccessEndpointManagement', 'canCreateArtifactsByPolicy'] }, {}],
    [
      { any: ['canAccessEndpointManagement', 'canCreateArtifactsByPolicy'] },
      { canCreateArtifactsByPolicy: false },
    ],
    [
      {
        all: ['canAccessEndpointManagement'],
        any: ['canCreateArtifactsByPolicy', 'canIsolateHost'],
      },
      { canCreateArtifactsByPolicy: false },
    ],
  ])('should grant access when needed authz is %j', (neededAuthz, authzOverrides) => {
    Object.assign(mockContext.securitySolution.endpointAuthz, authzOverrides);
    withEndpointAuthz(neededAuthz, logger, mockRequestHandler)(
      mockContext,
      mockRequest,
      mockResponse
    );

    expect(mockRequestHandler).toHaveBeenCalled();
  });

  it.each<[EndpointApiNeededAuthz, Partial<EndpointAuthz>]>([
    [
      { all: ['canAccessEndpointManagement', 'canCreateArtifactsByPolicy'] },
      { canCreateArtifactsByPolicy: false },
    ],
    [
      { any: ['canAccessEndpointManagement', 'canCreateArtifactsByPolicy'] },
      { canAccessEndpointManagement: false, canCreateArtifactsByPolicy: false },
    ],
    [
      {
        all: ['canAccessEndpointManagement'],
        any: ['canCreateArtifactsByPolicy'],
      },
      { canCreateArtifactsByPolicy: false },
    ],
  ])('should deny access when not authorized for %j', (neededAuthz, authzOverrides) => {
    Object.assign(mockContext.securitySolution.endpointAuthz, authzOverrides);

    withEndpointAuthz(neededAuthz, logger, mockRequestHandler)(
      mockContext,
      mockRequest,
      mockResponse
    );

    expect(mockRequestHandler).not.toHaveBeenCalled();
    expect(mockResponse.forbidden).toHaveBeenCalledWith({
      body: expect.any(EndpointAuthorizationError),
    });
  });
});
