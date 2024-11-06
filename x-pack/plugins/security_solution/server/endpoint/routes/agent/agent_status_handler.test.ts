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
import type { ExperimentalFeatures } from '../../../../common';
import { agentServiceMocks as mockAgentService } from '../../services/agent/mocks';
import { getAgentStatusClient as _getAgentStatusClient } from '../../services';
import type { DeepMutable } from '../../../../common/endpoint/types';

jest.mock('../../services', () => {
  const realModule = jest.requireActual('../../services');

  return {
    ...realModule,
    getAgentStatusClient: jest.fn((agentType: ResponseActionAgentType) => {
      return mockAgentService.createClient(agentType);
    }),
  };
});

const getAgentStatusClientMock = _getAgentStatusClient as jest.Mock;

describe('Agent Status API route handler', () => {
  let apiTestSetup: HttpApiTestSetupMock<never, DeepMutable<EndpointAgentStatusRequestQueryParams>>;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<
      never,
      DeepMutable<EndpointAgentStatusRequestQueryParams>
    >['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    never,
    EndpointAgentStatusRequestQueryParams
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    never,
    EndpointAgentStatusRequestQueryParams
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<never, EndpointAgentStatusRequestQueryParams>();
    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      query: { agentType: 'sentinel_one', agentIds: ['one', 'two'] },
    });

    (
      (await apiTestSetup.httpHandlerContextMock.actions).getActionsClient as jest.Mock
    ).mockReturnValue(sentinelOneMock.createConnectorActionsClient());

    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV1Enabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
    };

    registerAgentStatusRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  it.each`
    agentType         | featureFlag
    ${'sentinel_one'} | ${'responseActionsSentinelOneV1Enabled'}
    ${'crowdstrike'}  | ${'responseActionsCrowdstrikeManualHostIsolationEnabled'}
  `(
    'should error if the $agentType feature flag ($featureFlag) is turned off',
    async ({
      agentType,
      featureFlag,
    }: {
      agentType: ResponseActionAgentType;
      featureFlag: keyof ExperimentalFeatures;
    }) => {
      apiTestSetup.endpointAppContextMock.experimentalFeatures = {
        ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
        [featureFlag]: false,
      };
      httpRequestMock.query.agentType = agentType;

      await apiTestSetup
        .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(CustomHttpRequestError),
      });
    }
  );

  it.each(RESPONSE_ACTION_AGENT_TYPE)('should accept agent type of %s', async (agentType) => {
    httpRequestMock.query.agentType = agentType;
    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalled();
    expect(getAgentStatusClientMock).toHaveBeenCalledWith(agentType, {
      esClient: (await httpHandlerContextMock.core).elasticsearch.client.asInternalUser,
      soClient:
        apiTestSetup.endpointAppContextMock.service.savedObjects.createInternalScopedSoClient(),
      connectorActionsClient: (await httpHandlerContextMock.actions).getActionsClient(),
      endpointService: apiTestSetup.endpointAppContextMock.service,
    });
  });

  it('should return status code 200 with expected payload', async () => {
    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalledWith({
      body: {
        data: {
          one: {
            agentType: 'sentinel_one',
            found: true,
            agentId: 'one',
            isolated: false,
            lastSeen: expect.any(String),
            pendingActions: {},
            status: 'healthy',
          },
          two: {
            agentType: 'sentinel_one',
            found: true,
            agentId: 'two',
            isolated: false,
            lastSeen: expect.any(String),
            pendingActions: {},
            status: 'healthy',
          },
        },
      },
    });
  });

  it('should NOT use space ID in creating SO client when feature is disabled', async () => {
    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalled();
    expect(
      apiTestSetup.endpointAppContextMock.service.savedObjects.createInternalScopedSoClient
    ).toHaveBeenCalledWith({
      spaceId: undefined,
    });
  });

  it('should use a scoped SO client when spaces awareness feature is enabled', async () => {
    // @ts-expect-error write to readonly property
    apiTestSetup.endpointAppContextMock.service.experimentalFeatures.endpointManagementSpaceAwarenessEnabled =
      true;

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'foo'
    );

    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalled();
    expect(
      apiTestSetup.endpointAppContextMock.service.savedObjects.createInternalScopedSoClient
    ).toHaveBeenCalledWith({
      spaceId: 'foo',
    });
  });
});
