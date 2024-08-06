/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { EndpointActionFileDownloadParams } from '../../../../common/api/endpoint';
import { getActionFileInfoRouteHandler, registerActionFileInfoRoute } from './file_info_handler';
import {
  ACTION_AGENT_FILE_INFO_ROUTE,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import { EndpointAuthorizationError } from '../../errors';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
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

describe('Response Action file info API', () => {
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
      ).mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canWriteFileOperations: false,
          canWriteExecuteOperations: false,
        })
      );

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

    beforeEach(async () => {
      fileInfoHandler = getActionFileInfoRouteHandler(apiTestSetup.endpointAppContextMock);
    });

    it('should respond with expected output', async () => {
      await fileInfoHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          data: {
            actionId: '321-654',
            agentId: '111-222',
            agentType: 'endpoint',
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
