/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock, coreMock } from '@kbn/core/server/mocks';

import type { FleetRequestHandlerContext } from '../..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { appContextService } from '../../services';
import type { GetUninstallTokensRequestSchema } from '../../types/rest_spec/uninstall_token';

import { getUninstallTokensHandler } from './handlers';

describe('getUninstallTokensHandler', () => {
  let context: FleetRequestHandlerContext;
  let request: KibanaRequest<unknown, TypeOf<typeof GetUninstallTokensRequestSchema.query>>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let appContextStartContractMock: MockedFleetAppContext;
  let getAllTokensMock: jest.Mock;

  const uninstallTokensFixture = {
    'policy-id-1': '123456',
    'policy-id-2': 'abcdef',
    'policy-id-3': '9876543210',
  };

  beforeEach(async () => {
    context = coreMock.createCustomRequestHandlerContext(xpackMocks.createRequestHandlerContext());
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest();

    const contractMock = createAppContextStartContractMock();
    appContextStartContractMock = {
      ...contractMock,
      experimentalFeatures: {
        ...contractMock.experimentalFeatures,
        agentTamperProtectionEnabled: true,
      },
    };

    appContextService.start(appContextStartContractMock);
    getAllTokensMock = appContextService.getUninstallTokenService()?.getAllTokens as jest.Mock;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  it('should return uninstall tokens for all policies', async () => {
    getAllTokensMock.mockResolvedValue(uninstallTokensFixture);

    await getUninstallTokensHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        items: { ...uninstallTokensFixture },
        total: 3,
        page: 1,
        perPage: 20,
      },
    });
  });

  it('should return internal error when uninstallTokenService is unavailable', async () => {
    appContextService.stop();
    appContextService.start({
      ...appContextStartContractMock,
      // @ts-expect-error
      uninstallTokenService: undefined,
    });

    await getUninstallTokensHandler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Uninstall Token Service is unavailable.' },
    });
  });

  it('should return generic internal error when uninstallTokenService throws error', async () => {
    getAllTokensMock.mockRejectedValue(Error('something happened'));

    await getUninstallTokensHandler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to get uninstall tokens.' },
    });
  });

  it('should return 404 if Agent Tamper Protection feature flag is disabled', async () => {
    appContextService.stop();
    appContextService.start({
      ...appContextStartContractMock,
      experimentalFeatures: {
        ...appContextStartContractMock.experimentalFeatures,
        agentTamperProtectionEnabled: false,
      },
    });

    await getUninstallTokensHandler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 404,
      body: { message: 'Not Found' },
    });
  });
});
