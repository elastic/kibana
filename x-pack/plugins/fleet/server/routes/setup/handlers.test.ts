/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwaitedProperties } from '@kbn/utility-types';
import { httpServerMock, savedObjectsClientMock, coreMock } from '@kbn/core/server/mocks';

import type { PostFleetSetupResponse } from '../../../common/types';
import { API_VERSIONS } from '../../../common/constants';
import { RegistryError } from '../../errors';
import {
  createAppContextStartContractMock,
  createPackagePolicyServiceMock,
  xpackMocks,
} from '../../mocks';
import { agentServiceMock } from '../../services/agents/agent_service.mock';
import { appContextService } from '../../services/app_context';
import { setupFleet } from '../../services/setup';
import type { FleetRequestHandlerContext } from '../../types';
import { hasFleetServers } from '../../services/fleet_server';
import { createFleetAuthzMock } from '../../../common/mocks';

import { fleetSetupHandler, getFleetStatusHandler } from './handlers';

jest.mock('../../services/setup', () => {
  return {
    ...jest.requireActual('../../services/setup'),
    setupFleet: jest.fn(),
  };
});

jest.mock('../../services/fleet_server');

const mockSetupFleet = setupFleet as jest.MockedFunction<typeof setupFleet>;

describe('FleetSetupHandler', () => {
  let context: AwaitedProperties<Omit<FleetRequestHandlerContext, 'resolve'>>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(async () => {
    context = {
      ...xpackMocks.createRequestHandlerContext(),
      fleet: {
        agentClient: {
          asCurrentUser: agentServiceMock.createClient(),
          asInternalUser: agentServiceMock.createClient(),
        },
        authz: createFleetAuthzMock(),
        packagePolicyService: {
          asCurrentUser: createPackagePolicyServiceMock(),
          asInternalUser: createPackagePolicyServiceMock(),
        },
        internalSoClient: savedObjectsClientMock.create(),
        spaceId: 'default',
        limitedToPackages: undefined,
      },
    };
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/api/fleet/setup',
      headers: { 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    });
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  it('POST /setup succeeds w/200 and body of resolved value', async () => {
    mockSetupFleet.mockImplementation(() =>
      Promise.resolve({
        isInitialized: true,
        nonFatalErrors: [],
      })
    );
    await fleetSetupHandler(coreMock.createCustomRequestHandlerContext(context), request, response);

    const expectedBody: PostFleetSetupResponse = {
      isInitialized: true,
      nonFatalErrors: [],
    };
    expect(response.customError).toHaveBeenCalledTimes(0);
    expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
  });

  it('POST /setup fails w/500 on custom error', async () => {
    mockSetupFleet.mockImplementation(() => Promise.reject(new Error('SO method mocked to throw')));
    await fleetSetupHandler(coreMock.createCustomRequestHandlerContext(context), request, response);

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'SO method mocked to throw',
      },
    });
  });

  it('POST /setup fails w/502 on RegistryError', async () => {
    mockSetupFleet.mockImplementation(() =>
      Promise.reject(new RegistryError('Registry method mocked to throw'))
    );

    await fleetSetupHandler(coreMock.createCustomRequestHandlerContext(context), request, response);
    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: {
        message: 'Registry method mocked to throw',
      },
    });
  });
});

describe('FleetStatusHandler', () => {
  let context: AwaitedProperties<Omit<FleetRequestHandlerContext, 'resolve'>>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(async () => {
    context = {
      ...xpackMocks.createRequestHandlerContext(),
      fleet: {
        agentClient: {
          asCurrentUser: agentServiceMock.createClient(),
          asInternalUser: agentServiceMock.createClient(),
        },
        authz: createFleetAuthzMock(),
        packagePolicyService: {
          asCurrentUser: createPackagePolicyServiceMock(),
          asInternalUser: createPackagePolicyServiceMock(),
        },
        internalSoClient: savedObjectsClientMock.create(),
        spaceId: 'default',
        limitedToPackages: undefined,
      },
    };
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/api/fleet/status',
      headers: { 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    });
    // prevents `Logger not set.` and other appContext errors
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  it('POST /status w/200 and body without missing requirements', async () => {
    jest
      .mocked(appContextService.getSecurity().authc.apiKeys.areAPIKeysEnabled)
      .mockResolvedValue(true);
    jest.mocked(hasFleetServers).mockResolvedValue(true);
    await getFleetStatusHandler(
      coreMock.createCustomRequestHandlerContext(context),
      request,
      response
    );

    const expectedBody = {
      isReady: true,
      missing_optional_features: [],
      missing_requirements: [],
    };
    expect(response.customError).toHaveBeenCalledTimes(0);
    expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
  });

  it('POST /status w/200 and body with missing requirements', async () => {
    jest
      .mocked(appContextService.getSecurity().authc.apiKeys.areAPIKeysEnabled)
      .mockResolvedValue(false);
    jest.mocked(hasFleetServers).mockResolvedValue(false);
    await getFleetStatusHandler(
      coreMock.createCustomRequestHandlerContext(context),
      request,
      response
    );

    const expectedBody = {
      isReady: false,
      missing_optional_features: [],
      missing_requirements: ['api_keys', 'fleet_server'],
    };
    expect(response.customError).toHaveBeenCalledTimes(0);
    expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
  });

  it('POST /status  w/200 with fleet server standalone', async () => {
    jest.mocked(hasFleetServers).mockResolvedValue(false);
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          fleetServerStandalone: true,
        },
      } as any)
    );
    jest
      .mocked(appContextService.getSecurity().authc.apiKeys.areAPIKeysEnabled)
      .mockResolvedValue(true);
    await getFleetStatusHandler(
      coreMock.createCustomRequestHandlerContext(context),
      request,
      response
    );

    const expectedBody = {
      isReady: true,
      missing_optional_features: [],
      missing_requirements: [],
    };
    expect(response.customError).toHaveBeenCalledTimes(0);
    expect(response.ok).toHaveBeenCalledWith({ body: expectedBody });
  });
});
