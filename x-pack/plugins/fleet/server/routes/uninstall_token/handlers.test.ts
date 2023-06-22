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

import type {
  GetUninstallTokensByPolicyIdResponse,
  GetUninstallTokensMetadataResponse,
} from '../../../common/types/rest_spec/uninstall_token';

import type { FleetRequestHandlerContext } from '../..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { appContextService } from '../../services';
import type {
  GetUninstallTokensByPolicyIdRequestSchema,
  GetUninstallTokensMetadataRequestSchema,
} from '../../types/rest_spec/uninstall_token';

import { registerRoutes } from '.';

import { getUninstallTokensByPolicyIdHandler, getUninstallTokensMetadataHandler } from './handlers';

describe('uninstall token handlers', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let appContextStartContractMock: MockedFleetAppContext;
  let getAllTokensMock: jest.Mock;
  let getTokensForOnePolicyMock: jest.Mock;

  const uninstallTokensResponseFixture: GetUninstallTokensMetadataResponse = {
    items: [
      { policy_id: 'policy-id-1', created_at: '2023-06-15T16:46:48.274Z' },
      { policy_id: 'policy-id-2', created_at: '2023-06-15T16:46:48.274Z' },
      { policy_id: 'policy-id-3', created_at: '2023-06-15T16:46:48.274Z' },
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
    getAllTokensMock = uninstallTokenService.getTokenMetadataForAllPolicies as jest.Mock;
    getTokensForOnePolicyMock = uninstallTokenService.getTokenHistoryForPolicy as jest.Mock;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('getUninstallTokensHandler', () => {
    let request: KibanaRequest<
      unknown,
      TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>
    >;

    beforeEach(() => {
      request = httpServerMock.createKibanaRequest();
    });

    it('should return uninstall tokens for all policies', async () => {
      getAllTokensMock.mockResolvedValue(uninstallTokensResponseFixture);

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
      getAllTokensMock.mockRejectedValue(Error('something happened'));

      await getUninstallTokensMetadataHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'something happened' },
      });
    });
  });

  describe('getUninstallTokensByPolicyIdHandler', () => {
    let request: KibanaRequest<TypeOf<typeof GetUninstallTokensByPolicyIdRequestSchema.params>>;

    beforeEach(() => {
      request = httpServerMock.createKibanaRequest({ params: { agentPolicyId: '123' } });
    });

    it('should return uninstall tokens for given policy ID', async () => {
      const tokenForOnePolicy: GetUninstallTokensByPolicyIdResponse = {
        items: [{ ...uninstallTokensResponseFixture.items[0], token: '123456' }],
        total: 1,
      };
      getTokensForOnePolicyMock.mockResolvedValue(tokenForOnePolicy);

      await getUninstallTokensByPolicyIdHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({ body: tokenForOnePolicy });
    });

    it('should return internal error when uninstallTokenService is unavailable', async () => {
      appContextService.stop();
      appContextService.start({
        ...appContextStartContractMock,
        // @ts-expect-error
        uninstallTokenService: undefined,
      });

      await getUninstallTokensByPolicyIdHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Uninstall Token Service is unavailable.' },
      });
    });

    it('should return internal error when uninstallTokenService throws error', async () => {
      getTokensForOnePolicyMock.mockRejectedValue(Error('something really happened'));

      await getUninstallTokensByPolicyIdHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'something really happened' },
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
      expect(router.get).toHaveBeenCalledWith(
        expect.any(Object),
        getUninstallTokensByPolicyIdHandler
      );
    });

    it('should NOT register handlers if feature flag is disabled', async () => {
      config = { enableExperimental: [] };

      registerRoutes(router, config);

      expect(router.get).not.toHaveBeenCalled();
    });
  });
});
