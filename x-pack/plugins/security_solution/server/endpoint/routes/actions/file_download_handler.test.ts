/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getActionFileDownloadRouteHandler,
  registerActionFileDownloadRoutes,
} from './file_download_handler';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { EndpointActionFileDownloadParams } from '../../../../common/endpoint/schema/actions';
import {
  getFileDownloadStream as _getFileDownloadStream,
  validateActionId as _validateActionId,
  validateActionFileId as _validateActionFileId,
} from '../../services';
import { EndpointAuthorizationError, NotFoundError } from '../../errors';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import stream from 'stream';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';

jest.mock('../../services');

describe('Response Actions file download API', () => {
  const getFileDownloadStream = _getFileDownloadStream as jest.Mock;
  const validateActionIdMock = _validateActionId as jest.Mock;
  const validateFileIdMock = _validateActionFileId as jest.Mock;

  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<EndpointActionFileDownloadParams>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<EndpointActionFileDownloadParams>['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<EndpointActionFileDownloadParams>['httpResponseMock'];

  beforeEach(() => {
    apiTestSetup = createHttpApiTestSetupMock<EndpointActionFileDownloadParams>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);
    httpRequestMock = apiTestSetup.createRequestMock({
      params: { action_id: '111', file_id: '111.222' },
    });
  });

  describe('#registerActionFileDownloadRoutes()', () => {
    beforeEach(() => {
      registerActionFileDownloadRoutes(
        apiTestSetup.routerMock,
        apiTestSetup.endpointAppContextMock
      );
    });

    it('should register the route', () => {
      expect(
        apiTestSetup.getRegisteredRouteHandler('get', ACTION_AGENT_FILE_DOWNLOAD_ROUTE)
      ).toBeDefined();
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteFileOperations: false }));

      await apiTestSetup.getRegisteredRouteHandler('get', ACTION_AGENT_FILE_DOWNLOAD_ROUTE)(
        httpHandlerContextMock,
        httpRequestMock,
        httpResponseMock
      );

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Route handler', () => {
    let fileDownloadHandler: ReturnType<typeof getActionFileDownloadRouteHandler>;
    let esClientMock: ReturnType<HttpApiTestSetupMock['getEsClientMock']>;

    beforeEach(() => {
      esClientMock = apiTestSetup.getEsClientMock();
      fileDownloadHandler = getActionFileDownloadRouteHandler(apiTestSetup.endpointAppContextMock);

      validateActionIdMock.mockImplementation(async () => {});
      validateFileIdMock.mockImplementation(async () => {});

      getFileDownloadStream.mockImplementation(async () => {
        return {
          stream: new stream.Readable(),
          fileName: 'test.txt',
          mimeType: 'text/plain',
        };
      });
    });

    it('should error if action ID is invalid', async () => {
      validateActionIdMock.mockRejectedValueOnce(new NotFoundError('not found'));
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.notFound).toHaveBeenCalled();
    });

    it('should error if file ID is invalid', async () => {
      validateFileIdMock.mockRejectedValueOnce(new CustomHttpRequestError('invalid', 400));
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(CustomHttpRequestError),
      });
    });

    it('should retrieve the download Stream using correct file ID', async () => {
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(getFileDownloadStream).toHaveBeenCalledWith(
        esClientMock,
        expect.anything(),
        '111.222'
      );
    });

    it('should respond with expected HTTP headers', async () => {
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'cache-control': 'max-age=31536000, immutable',
            'content-disposition': 'attachment; filename="test.txt"',
            'content-type': 'application/octet-stream',
            'x-content-type-options': 'nosniff',
          },
        })
      );
    });
  });
});
