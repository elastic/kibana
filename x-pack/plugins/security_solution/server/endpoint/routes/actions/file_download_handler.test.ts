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
import { EndpointAuthorizationError } from '../../errors';
import {
  ACTION_AGENT_FILE_DOWNLOAD_ROUTE,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { EndpointActionFileDownloadParams } from '../../../../common/api/endpoint';
import { Readable } from 'stream';
import { createActionRequestsEsSearchResultsMock } from '../../services/actions/mocks';
import { applyEsClientSearchMock } from '../../mocks/utils.mock';

jest.mock('../../services', () => {
  const actual = jest.requireActual('../../services');
  return {
    ...actual,
    validateActionIdMock: jest.fn(async () => {}),
    getActionAgentType: jest.fn(async () => ({ agentType: 'endpoint' })),
  };
});

describe('Response Actions file download API', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<EndpointActionFileDownloadParams>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<EndpointActionFileDownloadParams>['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<EndpointActionFileDownloadParams>['httpResponseMock'];

  beforeEach(() => {
    apiTestSetup = createHttpApiTestSetupMock<EndpointActionFileDownloadParams>();

    const esClientMock = apiTestSetup.getEsClientMock();
    const actionRequestEsSearchResponse = createActionRequestsEsSearchResultsMock();

    actionRequestEsSearchResponse.hits.hits[0]._source!.EndpointActions.action_id = '321-654';
    actionRequestEsSearchResponse.hits.hits[0]._source!.EndpointActions.data.command = 'get-file';

    applyEsClientSearchMock({
      esClientMock,
      index: ENDPOINT_ACTIONS_INDEX,
      response: actionRequestEsSearchResponse,
    });

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
      ).mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canWriteFileOperations: false,
          canWriteExecuteOperations: false,
        })
      );

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

    beforeEach(async () => {
      fileDownloadHandler = getActionFileDownloadRouteHandler(apiTestSetup.endpointAppContextMock);
    });

    it('should respond with expected Body and HTTP headers', async () => {
      await fileDownloadHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'cache-control': 'max-age=31536000, immutable',
            'content-disposition': 'attachment; filename="foo.txt"',
            'content-type': 'application/octet-stream',
            'x-content-type-options': 'nosniff',
          },
          body: expect.any(Readable),
        })
      );
    });
  });
});
