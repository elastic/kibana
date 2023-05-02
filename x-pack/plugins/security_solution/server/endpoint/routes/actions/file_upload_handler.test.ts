/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type {
  EndpointActionFileDownloadParams,
  UploadActionRequestBody,
} from '../../../../common/endpoint/schema/actions';
import { registerActionFileUploadRoute } from './file_upload_handler';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';

describe('Upload response action create API handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type UploadHttpApiTestSetupMock = HttpApiTestSetupMock<any, any, UploadActionRequestBody>;

  let testSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<UploadHttpApiTestSetupMock['createRequestMock']>;
  let httpHandlerContextMock: UploadHttpApiTestSetupMock['httpHandlerContextMock'];
  let httpResponseMock: UploadHttpApiTestSetupMock['httpResponseMock'];

  beforeEach(() => {
    testSetup = createHttpApiTestSetupMock<EndpointActionFileDownloadParams>();

    ({ httpHandlerContextMock, httpResponseMock } = testSetup);
    httpRequestMock = testSetup.createRequestMock({
      body: {}, // FIXME:PT define body
    });
  });

  describe('registerActionFileUploadRoute()', () => {
    it('should register the route', () => {
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      expect(testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE)).toBeDefined();
    });

    it('should NOT register route if feature flag is false', () => {
      // @ts-expect-error
      testSetup.endpointAppContextMock.experimentalFeatures.responseActionUploadEnabled = false;
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      expect(() => testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE)).toThrow(
        'Handler for [post][/api/endpoint/action/upload] not found'
      );
    });

    it('should use maxUploadResponseActionFileBytes config value', () => {
      // @ts-expect-error
      testSetup.endpointAppContextMock.serverConfig.maxUploadResponseActionFileBytes = 999;
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

      expect(testSetup.getRegisteredRouteConfig('post', UPLOAD_ROUTE)?.options?.body).toEqual({
        accepts: ['multipart/form-data'],
        maxBytes: 999,
        output: 'stream',
      });
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteFileOperations: false }));
      registerActionFileUploadRoute(testSetup.routerMock, testSetup.endpointAppContextMock);
      await testSetup.getRegisteredRouteHandler('post', UPLOAD_ROUTE)(
        httpHandlerContextMock,
        httpRequestMock,
        httpResponseMock
      );

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('route request handler', () => {
    it.todo('should create a file');

    it.todo('should create the action using parameters with stored file info');

    it.todo('should delete file if creation of Action fails');
  });
});
