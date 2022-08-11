/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import type { Logger } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';

import { ConfigSchema, createConfig } from '../config';
import { securityMock } from '../mocks';
import { AnonymousAccessService } from './anonymous_access_service';

const createSecurityConfig = (config: Record<string, any> = {}) => {
  return createConfig(ConfigSchema.validate(config), loggingSystemMock.createLogger(), {
    isTLSEnabled: true,
  });
};

describe('AnonymousAccessService', () => {
  let service: AnonymousAccessService;
  let logger: jest.Mocked<Logger>;
  let getConfigMock: jest.Mock;
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    getConfigMock = jest.fn().mockReturnValue(createSecurityConfig());

    service = new AnonymousAccessService(logger, getConfigMock);
  });

  describe('#setup()', () => {
    it('returns proper contract', () => {
      expect(service.setup()).toBeUndefined();
    });
  });

  describe('#start()', () => {
    const getStartParams = () => {
      const mockCoreStart = coreMock.createStart();
      return {
        spaces: spacesMock.createStart().spacesService,
        basePath: mockCoreStart.http.basePath,
        capabilities: mockCoreStart.capabilities,
        clusterClient: elasticsearchServiceMock.createClusterClient(),
      };
    };

    it('returns proper contract', () => {
      service.setup();
      expect(service.start(getStartParams())).toEqual({
        isAnonymousAccessEnabled: false,
        accessURLParameters: null,
        getCapabilities: expect.any(Function),
      });
    });

    it('returns `isAnonymousAccessEnabled == true` if anonymous provider is enabled', () => {
      getConfigMock.mockReturnValue(
        createSecurityConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: { order: 0, credentials: { username: 'user', password: 'password' } },
              },
            },
          },
        })
      );

      service.setup();
      expect(service.start(getStartParams())).toEqual({
        isAnonymousAccessEnabled: true,
        accessURLParameters: null,
        getCapabilities: expect.any(Function),
      });
    });

    it('returns `isAnonymousAccessEnabled == true` and access URL parameters if anonymous provider is enabled, but not default', () => {
      getConfigMock.mockReturnValue(
        createSecurityConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: { order: 0, credentials: { username: 'user', password: 'password' } },
              },
              basic: { basic1: { order: 1 } },
            },
          },
        })
      );

      service.setup();
      expect(service.start(getStartParams())).toEqual({
        isAnonymousAccessEnabled: true,
        accessURLParameters: new Map([['auth_provider_hint', 'anonymous1']]),
        getCapabilities: expect.any(Function),
      });
    });

    it('returns `isAnonymousAccessEnabled == false` if anonymous provider defined, but disabled', () => {
      getConfigMock.mockReturnValue(
        createSecurityConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: {
                  enabled: false,
                  order: 0,
                  credentials: { username: 'user', password: 'password' },
                },
              },
            },
          },
        })
      );

      service.setup();
      expect(service.start(getStartParams())).toEqual({
        isAnonymousAccessEnabled: false,
        accessURLParameters: null,
        getCapabilities: expect.any(Function),
      });
    });

    describe('#getCapabilities', () => {
      beforeEach(() => {
        getConfigMock.mockReturnValue(
          createSecurityConfig({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: { order: 0, credentials: { username: 'user', password: 'password' } },
                },
              },
            },
          })
        );
      });

      it('returns default capabilities if anonymous access is not enabled', async () => {
        getConfigMock.mockReturnValue(createSecurityConfig());
        service.setup();

        const defaultCapabilities = { navLinks: {}, management: {}, catalogue: {} };
        const startParams = getStartParams();
        startParams.capabilities.resolveCapabilities.mockResolvedValue(defaultCapabilities);

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { authorization: 'xxx' },
        });
        await expect(service.start(startParams).getCapabilities(mockRequest)).resolves.toEqual(
          defaultCapabilities
        );
        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledTimes(1);
        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledWith(
          expect.objectContaining({ headers: {} }),
          {
            useDefaultCapabilities: true,
          }
        );
      });

      it('returns default capabilities if cannot authenticate anonymous service account', async () => {
        service.setup();

        const defaultCapabilities = { navLinks: {}, management: {}, catalogue: {} };
        const startParams = getStartParams();
        startParams.capabilities.resolveCapabilities.mockResolvedValue(defaultCapabilities);

        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        );
        startParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { authorization: 'xxx' },
        });
        await expect(service.start(startParams).getCapabilities(mockRequest)).resolves.toEqual(
          defaultCapabilities
        );

        expect(startParams.clusterClient.asScoped).toHaveBeenCalledTimes(1);
        expect(startParams.clusterClient.asScoped).toHaveBeenCalledWith(
          expect.objectContaining({ headers: { authorization: 'Basic dXNlcjpwYXNzd29yZA==' } })
        );
        expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(
          1
        );

        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledTimes(1);
        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledWith(
          expect.objectContaining({ headers: {} }),
          {
            useDefaultCapabilities: true,
          }
        );
      });

      it('fails if cannot retrieve capabilities because of unknown reason', async () => {
        service.setup();

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: {} })
        );
        const startParams = getStartParams();
        startParams.capabilities.resolveCapabilities.mockRejectedValue(failureReason);

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { authorization: 'xxx' },
        });
        await expect(service.start(startParams).getCapabilities(mockRequest)).rejects.toBe(
          failureReason
        );

        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledTimes(1);
        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledWith(
          expect.objectContaining({ headers: { authorization: 'Basic dXNlcjpwYXNzd29yZA==' } }),
          { useDefaultCapabilities: false }
        );
      });

      it('returns resolved capabilities', async () => {
        service.setup();

        const resolvedCapabilities = { navLinks: {}, management: {}, catalogue: {}, custom: {} };
        const startParams = getStartParams();
        startParams.capabilities.resolveCapabilities.mockResolvedValue(resolvedCapabilities);

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { authorization: 'xxx' },
        });
        await expect(service.start(startParams).getCapabilities(mockRequest)).resolves.toEqual(
          resolvedCapabilities
        );
        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledTimes(1);
        expect(startParams.capabilities.resolveCapabilities).toHaveBeenCalledWith(
          expect.objectContaining({ headers: { authorization: 'Basic dXNlcjpwYXNzd29yZA==' } }),
          { useDefaultCapabilities: false }
        );
      });
    });
  });
});
