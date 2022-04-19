/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwaitedProperties } from '@kbn/utility-types';
import { httpServerMock, savedObjectsClientMock, coreMock } from '@kbn/core/server/mocks';

import type { PostFleetSetupResponse } from '../../../common';
import { RegistryError } from '../../errors';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { agentServiceMock } from '../../services/agents/agent_service.mock';
import { appContextService } from '../../services/app_context';
import { setupFleet } from '../../services/setup';
import type { FleetRequestHandlerContext } from '../../types';

import { createFleetAuthzMock } from '../../../common';

import { fleetSetupHandler } from './handlers';

jest.mock('../../services/setup', () => {
  return {
    ...jest.requireActual('../../services/setup'),
    setupFleet: jest.fn(),
  };
});

const mockSetupFleet = setupFleet as jest.MockedFunction<typeof setupFleet>;

describe('FleetSetupHandler', () => {
  let context: AwaitedProperties<FleetRequestHandlerContext>;
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
        epm: {
          internalSoClient: savedObjectsClientMock.create(),
        },
        spaceId: 'default',
      },
    };
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/api/fleet/setup',
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
