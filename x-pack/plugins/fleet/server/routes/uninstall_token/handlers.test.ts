/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock, coreMock } from '@kbn/core/server/mocks';

import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

import type { GetUninstallTokensMetadataResponse } from '../../../common/types/rest_spec/uninstall_token';

import type { FleetRequestHandlerContext } from '../..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { appContextService } from '../../services';
import type { GetUninstallTokensMetadataRequestSchema } from '../../types/rest_spec/uninstall_token';

import { registerRoutes } from '.';

import { getUninstallTokensMetadataHandler } from './handlers';

describe('uninstall token handlers', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let appContextStartContractMock: MockedFleetAppContext;
  let getTokenMetadataMock: jest.Mock;

  const uninstallTokensResponseFixture: GetUninstallTokensMetadataResponse = {
    items: [
      { id: 'id-1', policy_id: 'policy-id-1', created_at: '2023-06-15T16:46:48.274Z' },
      { id: 'id-2', policy_id: 'policy-id-2', created_at: '2023-06-15T16:46:48.274Z' },
      { id: 'id-3', policy_id: 'policy-id-3', created_at: '2023-06-15T16:46:48.274Z' },
    ],
    total: 3,
    page: 1,
    perPage: 20,
  };

  beforeEach(async () => {
    context = coreMock.createCustomRequestHandlerContext(xpackMocks.createRequestHandlerContext());
    response = httpServerMock.createResponseFactory();

    appContextStartContractMock = createAppContextStartContractMock();
    appContextService.start(appContextStartContractMock);

    const uninstallTokenService = appContextService.getUninstallTokenService()!;
    getTokenMetadataMock = uninstallTokenService.getTokenMetadata as jest.Mock;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('getUninstallTokensMetadataHandler', () => {
    let request: KibanaRequest<
      unknown,
      TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>
    >;

    beforeEach(() => {
      request = httpServerMock.createKibanaRequest();
    });

    it('should return uninstall tokens for all policies', async () => {
      getTokenMetadataMock.mockResolvedValue(uninstallTokensResponseFixture);

      await getUninstallTokensMetadataHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: uninstallTokensResponseFixture,
      });
    });

    it('should return internal error when uninstallTokenService is unavailable', async () => {
      appContextService.stop();
      appContextService.start({
        ...appContextStartContractMock,
        // @ts-expect-error
        uninstallTokenService: undefined,
      });

      await getUninstallTokensMetadataHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Uninstall Token Service is unavailable.' },
      });
    });

    it('should return internal error when uninstallTokenService throws error', async () => {
      getTokenMetadataMock.mockRejectedValue(Error('something happened'));

      await getUninstallTokensMetadataHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'something happened' },
      });
    });
  });

  describe('Agent Tamper Protection feature flag', () => {
    let config: { enableExperimental: string[] };
    let router: RouterMock;

    beforeEach(() => {
      router = mockRouter.create();
    });

    it('should register handlers if feature flag is enabled', () => {
      config = { enableExperimental: ['agentTamperProtectionEnabled'] };

      registerRoutes(router, config);

      expect(router.get).toHaveBeenCalledWith(
        expect.any(Object),
        getUninstallTokensMetadataHandler
      );
    });

    it('should NOT register handlers if feature flag is disabled', async () => {
      config = { enableExperimental: [] };

      registerRoutes(router, config);

      expect(router.get).not.toHaveBeenCalled();
    });
  });
});
