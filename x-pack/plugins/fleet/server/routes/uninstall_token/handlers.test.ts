/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, VersionedRouter } from '@kbn/core-http-server';
import { httpServerMock, coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';

import { makeRouterWithFleetAuthz } from '../../services/security/fleet_router';
import type { FleetAuthzRouter } from '../../services/security/types';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../common/types/models/uninstall_token';

import type {
  GetUninstallTokenRequest,
  GetUninstallTokensMetadataResponse,
} from '../../../common/types/rest_spec/uninstall_token';

import type { FleetRequestHandlerContext } from '../..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { agentPolicyService, appContextService } from '../../services';
import type {
  GetUninstallTokenRequestSchema,
  GetUninstallTokensMetadataRequestSchema,
} from '../../types/rest_spec/uninstall_token';

import { createAgentPolicyMock } from '../../../common/mocks';

import { registerRoutes } from '.';

import { getUninstallTokenHandler, getUninstallTokensMetadataHandler } from './handlers';

jest.mock('../../services/agent_policy');

describe('uninstall token handlers', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let appContextStartContractMock: MockedFleetAppContext;

  beforeEach(async () => {
    context = coreMock.createCustomRequestHandlerContext(xpackMocks.createRequestHandlerContext());
    response = httpServerMock.createResponseFactory();

    appContextStartContractMock = createAppContextStartContractMock();
    appContextService.start(appContextStartContractMock);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('getUninstallTokensMetadataHandler', () => {
    const uninstallTokensFixture: UninstallTokenMetadata[] = [
      {
        id: 'id-1',
        policy_id: 'policy-id-1',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
      },
      {
        id: 'id-2',
        policy_id: 'policy-id-2',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
      },
      {
        id: 'id-3',
        policy_id: 'policy-id-3',
        policy_name: null,
        created_at: '2023-06-15T16:46:48.274Z',
      },
    ];

    const uninstallTokensResponseFixture: GetUninstallTokensMetadataResponse = {
      items: uninstallTokensFixture,
      total: 3,
      page: 1,
      perPage: 20,
    };

    let getTokenMetadataMock: jest.Mock;
    let request: KibanaRequest<
      unknown,
      TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>
    >;
    const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

    beforeEach(async () => {
      const uninstallTokenService = (await context.fleet).uninstallTokenService.asCurrentUser;
      getTokenMetadataMock = uninstallTokenService.getTokenMetadata as jest.Mock;
      mockAgentPolicyService.list.mockResolvedValue({
        items: [createAgentPolicyMock()],
        total: 1,
        page: 1,
        perPage: 1,
      });

      request = httpServerMock.createKibanaRequest();
    });

    it('should return uninstall tokens for all policies', async () => {
      getTokenMetadataMock.mockResolvedValue(uninstallTokensResponseFixture);

      await getUninstallTokensMetadataHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: uninstallTokensResponseFixture,
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

  describe('getUninstallTokenHandler', () => {
    const uninstallTokenFixture: UninstallToken = {
      id: 'id-1',
      policy_id: 'policy-id-1',
      policy_name: null,
      created_at: '2023-06-15T16:46:48.274Z',
      token: '123456789',
    };

    let getTokenMock: jest.Mock;
    let request: KibanaRequest<TypeOf<typeof GetUninstallTokenRequestSchema.params>>;

    beforeEach(async () => {
      const uninstallTokenService = (await context.fleet).uninstallTokenService.asCurrentUser;
      getTokenMock = uninstallTokenService.getToken as jest.Mock;

      const requestOptions: GetUninstallTokenRequest = {
        params: {
          uninstallTokenId: uninstallTokenFixture.id,
        },
      };
      request = httpServerMock.createKibanaRequest(requestOptions);
    });

    it('should return requested uninstall token', async () => {
      getTokenMock.mockResolvedValue(uninstallTokenFixture);

      await getUninstallTokenHandler(context, request, response);

      expect(getTokenMock).toHaveBeenCalledWith(uninstallTokenFixture.id);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          item: uninstallTokenFixture,
        },
      });
    });

    it('should return internal error when uninstallTokenService throws error', async () => {
      getTokenMock.mockRejectedValue(Error('something happened'));

      await getUninstallTokenHandler(context, request, response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'something happened' },
      });
    });
  });

  // TODO: remove it when agentTamperProtectionEnabled FF is removed
  describe.skip('Agent Tamper Protection feature flag', () => {
    let config: { enableExperimental: string[] };
    let fakeRouter: jest.Mocked<VersionedRouter<FleetRequestHandlerContext>>;
    let fleetAuthzRouter: FleetAuthzRouter;

    beforeEach(() => {
      fakeRouter = {
        versioned: {
          get: jest.fn().mockImplementation(() => {
            return {
              addVersion: jest
                .fn()
                .mockImplementation((options: any, handler: RequestHandler) => Promise.resolve()),
            };
          }),
        },
      } as unknown as jest.Mocked<VersionedRouter<FleetRequestHandlerContext>>;

      const mockLogger = loggingSystemMock.createLogger();
      fleetAuthzRouter = makeRouterWithFleetAuthz(fakeRouter as any, mockLogger);
    });

    it('should register handlers if feature flag is enabled', () => {
      config = { enableExperimental: ['agentTamperProtectionEnabled'] };

      registerRoutes(fleetAuthzRouter, config);
      const wrappedHandler =
        // @ts-ignore
        fakeRouter.versioned.get.mock.results[0].value.addVersion;

      expect(wrappedHandler).toHaveBeenCalled();
    });

    it('should NOT register handlers if feature flag is disabled', async () => {
      config = { enableExperimental: [] };
      registerRoutes(fleetAuthzRouter, config);
      // @ts-ignore
      const mockGet = fakeRouter.versioned.get;

      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
