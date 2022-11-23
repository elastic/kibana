/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionDetailsById as _getActionDetailsById } from '../../services';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { EndpointActionFileDownloadParams } from '../../../../common/endpoint/schema/actions';
import { getActionFileInfoRouteHandler, registerActionFileInfoRoute } from './file_info_handler';
import { ACTION_AGENT_FILE_INFO_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointAuthorizationError, NotFoundError } from '../../errors';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getFileInfo as _getFileInfo } from '../../services/actions/action_files';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';

jest.mock('../../services');
jest.mock('../../services/actions/action_files');

describe('Response Action file info API', () => {
  const getActionDetailsById = _getActionDetailsById as jest.Mock;
  const getFileInfo = _getFileInfo as jest.Mock;

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
      params: { action_id: '111', agent_id: '222' },
    });
  });

  describe('#registerActionFileInfoRoute()', () => {
    beforeEach(() => {
      registerActionFileInfoRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
    });

    it('should register the route', () => {
      expect(
        apiTestSetup.getRegisteredRouteHandler('get', ACTION_AGENT_FILE_INFO_ROUTE)
      ).toBeDefined();
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(getEndpointAuthzInitialStateMock({ canWriteFileOperations: false }));

      await apiTestSetup.getRegisteredRouteHandler('get', ACTION_AGENT_FILE_INFO_ROUTE)(
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
    let fileInfoHandler: ReturnType<typeof getActionFileInfoRouteHandler>;
    let esClientMock: ReturnType<HttpApiTestSetupMock['getEsClientMock']>;
    let action: ActionDetails;

    beforeEach(() => {
      esClientMock = apiTestSetup.getEsClientMock();
      action = new EndpointActionGenerator().generateActionDetails({
        id: '111',
        agents: ['222'],
      });
      fileInfoHandler = getActionFileInfoRouteHandler(apiTestSetup.endpointAppContextMock);

      getActionDetailsById.mockImplementation(async () => {
        return action;
      });

      getFileInfo.mockImplementation(async () => {
        return {
          created: '2022-10-10T14:57:30.682Z',
          id: '123',
          mimeType: 'text/plain',
          name: 'test.txt',
          size: 1234,
          status: 'READY',
        };
      });
    });

    it('should error if action ID is invalid', async () => {
      getActionDetailsById.mockImplementationOnce(async () => {
        throw new NotFoundError('not found');
      });
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.notFound).toHaveBeenCalled();
    });

    it('should error if agent id is not in the action', async () => {
      action.agents = ['333'];
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(CustomHttpRequestError),
      });
    });

    it('should retrieve the file info with correct file id', async () => {
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(getFileInfo).toHaveBeenCalledWith(esClientMock, expect.anything(), '111.222');
    });

    it('should respond with expected output', async () => {
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          data: {
            created: '2022-10-10T14:57:30.682Z',
            id: '123',
            mimeType: 'text/plain',
            name: 'test.txt',
            size: 1234,
            status: 'READY',
          },
        },
      });
    });
  });
});
