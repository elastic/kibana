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

import type { GetUninstallTokensByPolicyIdResponse } from '../../../common/types/rest_spec/agent_policy';

import type { GetUninstallTokensByPolicyIdRequestSchema } from '../../types';
import { appContextService } from '../../services';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import type { FleetRequestHandlerContext } from '../..';
import type { MockedFleetAppContext } from '../../mocks';

import { registerRoutes } from '.';

import { getUninstallTokensByPolicyIdHandler } from './handlers';

describe('agent policy handlers', () => {
  describe('uninstall_tokens', () => {
    let context: FleetRequestHandlerContext;
    let response: ReturnType<typeof httpServerMock.createResponseFactory>;
    let appContextStartContractMock: MockedFleetAppContext;
    let getTokensForOnePolicyMock: jest.Mock;

    beforeEach(async () => {
      context = coreMock.createCustomRequestHandlerContext(
        xpackMocks.createRequestHandlerContext()
      );
      response = httpServerMock.createResponseFactory();

      appContextStartContractMock = createAppContextStartContractMock();
      appContextService.start(appContextStartContractMock);

      const uninstallTokenService = appContextService.getUninstallTokenService()!;
      getTokensForOnePolicyMock = uninstallTokenService.getTokenHistoryForPolicy as jest.Mock;
    });

    afterEach(async () => {
      jest.clearAllMocks();
      appContextService.stop();
    });

    describe('getUninstallTokensByPolicyIdHandler', () => {
      const policyId = 'abcdef';
      const tokenForOnePolicy: GetUninstallTokensByPolicyIdResponse = {
        items: [
          {
            id: 'id',
            token: '123456',
            policy_id: policyId,
            created_at: '2023-06-15T16:46:48.274Z',
          },
        ],
        total: 1,
      };
      let request: KibanaRequest<TypeOf<typeof GetUninstallTokensByPolicyIdRequestSchema.params>>;

      beforeEach(() => {
        request = httpServerMock.createKibanaRequest({ params: { agentPolicyId: policyId } });
      });

      it('should return uninstall tokens for given policy ID', async () => {
        getTokensForOnePolicyMock.mockResolvedValue(tokenForOnePolicy);

        await getUninstallTokensByPolicyIdHandler(context, request, response);

        expect(getTokensForOnePolicyMock).toHaveBeenCalledWith(policyId);
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
        getTokensForOnePolicyMock.mockRejectedValue(Error('something happened'));

        await getUninstallTokensByPolicyIdHandler(context, request, response);

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
          getUninstallTokensByPolicyIdHandler
        );
      });

      it('should NOT register handlers if feature flag is disabled', async () => {
        config = { enableExperimental: [] };

        registerRoutes(router, config);

        expect(router.get).not.toHaveBeenCalledWith(
          expect.any(Object),
          getUninstallTokensByPolicyIdHandler
        );
      });
    });
  });
});
