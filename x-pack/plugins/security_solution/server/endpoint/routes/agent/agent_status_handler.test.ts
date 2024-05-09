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
      responseActionsCrowdstrikeManualHostIsolationEnabled: false,
      agentStatusClientEnabled: false,
    };

    registerAgentStatusRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  it('should error if the sentinel_one feature flag is turned off', async () => {
    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV1Enabled: false,
      responseActionsCrowdstrikeManualHostIsolationEnabled: false,
    };

    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: expect.any(CustomHttpRequestError),
    });
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)('should accept agent type of %s', async (agentType) => {
    // @ts-expect-error `query.*` is not mutable
    httpRequestMock.query.agentType = agentType;
    // TODO TC: Temporary workaround to catch thrown error while Crowdstrike status is not yet supported
    try {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
    } catch (error) {
      if (agentType === 'crowdstrike') {
        expect(error.message).toBe('Agent type [crowdstrike] does not support agent status');
      }
    }
    if (agentType !== 'crowdstrike') {
      expect(httpResponseMock.ok).toHaveBeenCalled();
    }
  });

  it('should accept agent type of `endpoint` when FF is disabled', async () => {
    apiTestSetup.endpointAppContextMock.experimentalFeatures = {
      ...apiTestSetup.endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV1Enabled: false,
    };
    // @ts-expect-error `query.*` is not mutable
    httpRequestMock.query.agentType = 'endpoint';
    await apiTestSetup
      .getRegisteredVersionedRoute('get', AGENT_STATUS_ROUTE, '1')
      .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

    expect(httpResponseMock.ok).toHaveBeenCalled();
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
            found: false,
            agentId: 'one',
            isUninstalled: false,
            isPendingUninstall: false,
            isolated: false,
            lastSeen: '',
            pendingActions: {
              execute: 0,
              'get-file': 0,
              isolate: 0,
              'kill-process': 0,
              'running-processes': 0,
              'suspend-process': 0,
              unisolate: 0,
              upload: 0,
            },
            status: 'unenrolled',
          },
          two: {
            agentType: 'sentinel_one',
            found: false,
            agentId: 'two',
            isUninstalled: false,
            isPendingUninstall: false,
            isolated: false,
            lastSeen: '',
            pendingActions: {
              execute: 0,
              'get-file': 0,
              isolate: 0,
              'kill-process': 0,
              'running-processes': 0,
              'suspend-process': 0,
              unisolate: 0,
              upload: 0,
            },
            status: 'unenrolled',
          },
        },
      },
    });
  });
});
