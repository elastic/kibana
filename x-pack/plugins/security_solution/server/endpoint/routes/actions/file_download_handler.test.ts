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
import { validateActionId as _validateActionId } from '../../services';
import { EndpointAuthorizationError, NotFoundError } from '../../errors';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { FleetFromHostFileClientInterface } from '@kbn/fleet-plugin/server';
import type { EndpointActionFileDownloadParams } from '../../../../common/api/endpoint';

jest.mock('../../services');

describe('Response Actions file download API', () => {
  const validateActionIdMock = _validateActionId as jest.Mock;

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
      params: { action_id: '321-654', file_id: '123-456-789' },
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
        apiTestSetup.getRegisteredVersionedRoute(
          'get',
          ACTION_AGENT_FILE_DOWNLOAD_ROUTE,
          '2023-10-31'
        )
      ).toBeDefined();
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteFileOperations: false }));

      await apiTestSetup
        .getRegisteredVersionedRoute('get', ACTION_AGENT_FILE_DOWNLOAD_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Route handler', () => {
    let fileDownloadHandler: ReturnType<typeof getActionFileDownloadRouteHandler>;
    let fleetFilesClientMock: jest.Mocked<FleetFromHostFileClientInterface>;

    beforeEach(async () => {
      fileDownloadHandler = getActionFileDownloadRouteHandler(apiTestSetup.endpointAppContextMock);

      validateActionIdMock.mockImplementation(async () => {});

      fleetFilesClientMock =
        (await apiTestSetup.endpointAppContextMock.service.getFleetFromHostFilesClient()) as jest.Mocked<FleetFromHostFileClientInterface>;
    });

    it('should error if action ID is invalid', async () => {
      validateActionIdMock.mockRejectedValueOnce(new NotFoundError('not found'));
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.notFound).toHaveBeenCalled();
    });

    it('should error if file ID is invalid', async () => {
      // @ts-expect-error assignment to readonly value
      httpRequestMock.params.file_id = 'invalid';
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(CustomHttpRequestError),
      });
    });

    it('should retrieve the download Stream using correct file ID', async () => {
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(fleetFilesClientMock.download).toHaveBeenCalledWith('123-456-789');
    });

    it('should respond with expected HTTP headers', async () => {
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'cache-control': 'max-age=31536000, immutable',
            'content-disposition': 'attachment; filename="foo.txt"',
            'content-type': 'application/octet-stream',
            'x-content-type-options': 'nosniff',
          },
        })
      );
    });
  });
});
