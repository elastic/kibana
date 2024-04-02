/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import { sentinelOneMock } from '../../services/actions/clients/sentinelone/mocks';
import { registerAgentStatusRoute } from './agent_status_handler';
import { AGENT_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { EndpointAgentStatusRequestQueryParams } from '../../../../common/api/endpoint/agent/get_agent_status_route';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';

describe('Agent Status API route handler', () => {
  let apiTestSetup: HttpApiTestSetupMock<never, EndpointAgentStatusRequestQueryParams>;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<never, EndpointAgentStatusRequestQueryParams>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    never,
    EndpointAgentStatusRequestQueryParams
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    never,
    EndpointAgentStatusRequestQueryParams
  >['httpResponseMock'];

  const getHttpReqMock = (agentType: ResponseActionAgentType) =>
    apiTestSetup.createRequestMock({
      query: { agentType, agentIds: ['one', 'two'] },
    });

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<never, EndpointAgentStatusRequestQueryParams>();
    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    (
      (await apiTestSetup.httpHandlerContextMock.actions).getActionsClient as jest.Mock
    ).mockReturnValue(sentinelOneMock.createConnectorActionsClient());

    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV1Enabled: true,
    };

    registerAgentStatusRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should error if the sentinel_one feature flag is turned off and agentType is `sentinel_one`', async () => {
    httpRequestMock = getHttpReqMock('sentinel_one');
    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV1Enabled: false,
    };

    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: expect.any(CustomHttpRequestError),
    });
  });

  it('should not error if the sentinel_one feature flag is turned off and agentType is `endpoint`', async () => {
    httpRequestMock = getHttpReqMock('endpoint');
    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV1Enabled: false,
    };

    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalled();
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)('should (v8.14) accept %s agent type', async (agentType) => {
    httpRequestMock = getHttpReqMock(agentType);
    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalled();
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should return status code 200 with expected payload for %s agent',
    async (agentType) => {
      httpRequestMock = getHttpReqMock(agentType);
      await apiTestSetup
        .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          data: {
            one: expect.objectContaining({
              agentId: 'one',
              agentType,
              found: false,
              isUninstalled: false,
              isPendingUninstall: false,
              isolated: false,
              lastSeen: '',
              pendingActions: {},
              status: 'offline',
            }),
            two: expect.objectContaining({
              agentId: 'two',
              agentType,
              found: false,
              isUninstalled: false,
              isPendingUninstall: false,
              isolated: false,
              lastSeen: '',
              pendingActions: {},
              status: 'offline',
            }),
          },
        },
      });
    }
  );
});
