/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Chance } from 'chance';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_PIT_KEEP_ALIVE, defineEsPitRoute, esPitInputSchema } from './es_pit';
import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { securityMock } from '@kbn/security-plugin/server/mocks';

describe('ES Point in time API endpoint', () => {
  const chance = new Chance();
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', () => {
    const router = httpServiceMock.createRouter();
    const cspContext: CspAppContext = {
      logger: loggingSystemMock.createLogger(),
      service: new CspAppService(),
      security: securityMock.createSetup(),
    };

    defineEsPitRoute(router, cspContext);

    const [config] = router.post.mock.calls[0];
    expect(config.path).toEqual('/internal/cloud_security_posture/es_pit');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspContext: CspAppContext = {
      logger: loggingSystemMock.createLogger(),
      service: new CspAppService(),
      security: securityMock.createSetup(),
    };

    defineEsPitRoute(router, cspContext);

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    };

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    const [_, handler] = router.post.mock.calls[0];
    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspContext: CspAppContext = {
      logger: loggingSystemMock.createLogger(),
      service: new CspAppService(),
      security: securityMock.createSetup(),
    };

    defineEsPitRoute(router, cspContext);

    const mockContext = {
      fleet: { authz: { fleet: { all: false } } },
    };

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    const [_, handler] = router.post.mock.calls[0];
    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(1);
  });

  it('should return the newly created PIT ID from ES', async () => {
    const router = httpServiceMock.createRouter();
    const cspContext: CspAppContext = {
      logger: loggingSystemMock.createLogger(),
      service: new CspAppService(),
      security: securityMock.createSetup(),
    };

    defineEsPitRoute(router, cspContext);

    const pitId = chance.string();
    mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.openPointInTime.mockImplementation(() => Promise.resolve({ id: pitId }));

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
      core: { elasticsearch: { client: { asCurrentUser: mockEsClient } } },
    };

    const indexName = chance.string();
    const keepAlive = chance.string();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      query: { index_name: indexName, keep_alive: keepAlive },
    });

    const [context, req, res] = [mockContext, mockRequest, mockResponse];
    const [_, handler] = router.post.mock.calls[0];
    await handler(context, req, res);

    expect(mockEsClient.openPointInTime).toHaveBeenCalledTimes(1);
    expect(mockEsClient.openPointInTime).toHaveBeenLastCalledWith({
      index: indexName,
      keep_alive: keepAlive,
    });

    expect(res.ok).toHaveBeenCalledTimes(1);
    expect(res.ok).toHaveBeenLastCalledWith({ body: pitId });
  });

  describe('test input schema', () => {
    it('passes keep alive and index name parameters', () => {
      const indexName = chance.string();
      const keepAlive = chance.string();
      const validatedQuery = esPitInputSchema.validate({
        index_name: indexName,
        keep_alive: keepAlive,
      });

      expect(validatedQuery).toMatchObject({
        index_name: indexName,
        keep_alive: keepAlive,
      });
    });

    it('populates default keep alive parameter value', () => {
      const indexName = chance.string();
      const validatedQuery = esPitInputSchema.validate({ index_name: indexName });

      expect(validatedQuery).toMatchObject({
        index_name: indexName,
        keep_alive: DEFAULT_PIT_KEEP_ALIVE,
      });
    });

    it('throws when index name parameter is not passed', () => {
      expect(() => {
        esPitInputSchema.validate({});
      }).toThrow();
    });

    it('throws when index name parameter is not a string', () => {
      const indexName = chance.integer();
      expect(() => {
        esPitInputSchema.validate({ index_name: indexName });
      }).toThrow();
    });

    it('throws when keep alive parameter is not a string', () => {
      const indexName = chance.string();
      const keepAlive = chance.integer();
      expect(() => {
        esPitInputSchema.validate({ index_name: indexName, keep_alive: keepAlive });
      }).toThrow();
    });
  });
});
