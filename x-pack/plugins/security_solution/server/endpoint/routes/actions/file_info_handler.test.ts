/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateActionId as _validateActionId } from '../../services';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { EndpointActionFileDownloadParams } from '../../../../common/api/endpoint';
import { getActionFileInfoRouteHandler, registerActionFileInfoRoute } from './file_info_handler';
import { ACTION_AGENT_FILE_INFO_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointAuthorizationError, NotFoundError } from '../../errors';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { FleetFromHostFileClientInterface } from '@kbn/fleet-plugin/server';

jest.mock('../../services');

describe('Response Action file info API', () => {
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

  describe('#registerActionFileInfoRoute()', () => {
    beforeEach(() => {
      registerActionFileInfoRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
    });

    it('should register the route', () => {
      expect(
        apiTestSetup.getRegisteredVersionedRoute('get', ACTION_AGENT_FILE_INFO_ROUTE, '2023-10-31')
      ).toBeDefined();
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteFileOperations: false }));

      await apiTestSetup
        .getRegisteredVersionedRoute('get', ACTION_AGENT_FILE_INFO_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Route handler', () => {
    let fileInfoHandler: ReturnType<typeof getActionFileInfoRouteHandler>;
    let fleetFilesClientMock: jest.Mocked<FleetFromHostFileClientInterface>;

    beforeEach(async () => {
      fileInfoHandler = getActionFileInfoRouteHandler(apiTestSetup.endpointAppContextMock);

      validateActionIdMock.mockImplementation(async () => {});

      fleetFilesClientMock =
        (await apiTestSetup.endpointAppContextMock.service.getFleetFromHostFilesClient()) as jest.Mocked<FleetFromHostFileClientInterface>;
    });

    it('should error if action ID is invalid', async () => {
      validateActionIdMock.mockImplementationOnce(async () => {
        throw new NotFoundError('not found');
      });
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.notFound).toHaveBeenCalled();
    });

    it('should error if file ID is invalid', async () => {
      // @ts-expect-error assignment to readonly value
      httpRequestMock.params.file_id = 'invalid';
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(CustomHttpRequestError),
      });
    });

    it('should retrieve the file info with correct file id', async () => {
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(fleetFilesClientMock.get).toHaveBeenCalledWith('123-456-789');
    });

    it('should respond with expected output', async () => {
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          data: {
            actionId: '321-654',
            agentId: '111-222',
            created: '2023-05-12T19:47:33.702Z',
            id: '123-456-789',
            mimeType: 'text/plain',
            name: 'foo.txt',
            size: 45632,
            status: 'READY',
          },
        },
      });
    });
  });
});
