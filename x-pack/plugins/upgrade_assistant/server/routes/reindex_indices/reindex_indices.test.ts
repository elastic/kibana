/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { loggingSystemMock } from 'src/core/server/mocks';
import { licensingMock } from '../../../../licensing/server/mocks';
import { securityMock } from '../../../../security/server/mocks';
import { createMockRouter, MockRouter, routeHandlerContextMock } from '../__mocks__/routes.mock';
import { createRequestMock } from '../__mocks__/request.mock';
import { handleEsError } from '../../shared_imports';
import { errors as esErrors } from '@elastic/elasticsearch';

const mockReindexService = {
  hasRequiredPrivileges: jest.fn(),
  detectReindexWarnings: jest.fn(),
  createReindexOperation: jest.fn(),
  findAllInProgressOperations: jest.fn(),
  findReindexOperation: jest.fn(),
  processNextStep: jest.fn(),
  resumeReindexOperation: jest.fn(),
  cancelReindexing: jest.fn(),
  getIndexAliases: jest.fn().mockResolvedValue({}),
};
jest.mock('../../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

jest.mock('../../lib/reindexing', () => {
  return {
    reindexServiceFactory: () => mockReindexService,
    generateNewIndexName: () => 'reindexed-foo',
  };
});

import { ReindexSavedObject, ReindexStatus } from '../../../common/types';
import { credentialStoreFactory } from '../../lib/reindexing/credential_store';
import { registerReindexIndicesRoutes } from './reindex_indices';

const logMock = loggingSystemMock.create().get();

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('reindex API', () => {
  let routeDependencies: any;
  let mockRouter: MockRouter;

  const credentialStore = credentialStoreFactory(logMock);
  const worker = {
    includes: jest.fn(),
    forceRefresh: jest.fn(),
  } as any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      credentialStore,
      router: mockRouter,
      licensing: licensingMock.createSetup(),
      lib: { handleEsError },
      getSecurityPlugin: () => securityMock.createStart(),
    };
    registerReindexIndicesRoutes(routeDependencies, () => worker);

    mockReindexService.hasRequiredPrivileges.mockResolvedValue(true);
    mockReindexService.detectReindexWarnings.mockReset();
    mockReindexService.createReindexOperation.mockReset();
    mockReindexService.findAllInProgressOperations.mockReset();
    mockReindexService.findReindexOperation.mockReset();
    mockReindexService.processNextStep.mockReset();
    mockReindexService.resumeReindexOperation.mockReset();
    mockReindexService.cancelReindexing.mockReset();
    worker.includes.mockReset();
    worker.forceRefresh.mockReset();

    // Reset the credentialMap
    credentialStore.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/upgrade_assistant/reindex/{indexName}', () => {
    it('returns the attributes of the reindex operation and reindex warnings', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'wowIndex', status: ReindexStatus.inProgress },
      });
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce([
        {
          warningType: 'customTypeName',
          meta: {
            typeName: 'my_mapping_type',
          },
        },
      ]);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'wowIndex' } }),
        kibanaResponseFactory
      );

      // It called into the service correctly
      expect(mockReindexService.findReindexOperation).toHaveBeenCalledWith('wowIndex');
      expect(mockReindexService.detectReindexWarnings).toHaveBeenCalledWith('wowIndex');

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data.reindexOp).toEqual({ indexName: 'wowIndex', status: ReindexStatus.inProgress });
      expect(data.warnings).toEqual([
        {
          warningType: 'customTypeName',
          meta: {
            typeName: 'my_mapping_type',
          },
        },
      ]);
    });

    it('returns es errors', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockRejectedValueOnce(
        new esErrors.ResponseError({ statusCode: 404 } as any)
      );

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'anIndex' } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(404);
    });

    it("returns null for both if reindex operation doesn't exist and index doesn't exist", async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce(null);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'anIndex' } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data.reindexOp).toBeUndefined();
      expect(data.warnings).toBeNull();
    });
  });

  describe('POST /api/upgrade_assistant/reindex/{indexName}', () => {
    it('creates a new reindexOp', async () => {
      mockReindexService.createReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex' },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'theIndex' } }),
        kibanaResponseFactory
      );

      // It called create correctly
      expect(mockReindexService.createReindexOperation).toHaveBeenCalledWith('theIndex', undefined);

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data).toEqual({ indexName: 'theIndex' });
    });

    it('calls worker.forceRefresh', async () => {
      mockReindexService.createReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex' },
      });

      await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'theIndex' } }),
        kibanaResponseFactory
      );

      expect(worker.forceRefresh).toHaveBeenCalled();
    });

    it('inserts headers into the credentialStore', async () => {
      const reindexOp = {
        attributes: { indexName: 'theIndex' },
      } as ReindexSavedObject;
      mockReindexService.createReindexOperation.mockResolvedValueOnce(reindexOp);

      await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          headers: {
            'kbn-auth-x': 'HERE!',
          },
          params: { indexName: 'theIndex' },
        }),
        kibanaResponseFactory
      );

      expect(credentialStore.get(reindexOp)!['kbn-auth-x']).toEqual('HERE!');
    });

    it('resumes a reindexOp if it is paused', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex', status: ReindexStatus.paused },
      });
      mockReindexService.resumeReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex', status: ReindexStatus.inProgress },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: { indexName: 'theIndex' },
        }),
        kibanaResponseFactory
      );
      // It called resume correctly
      expect(mockReindexService.resumeReindexOperation).toHaveBeenCalledWith('theIndex', undefined);
      expect(mockReindexService.createReindexOperation).not.toHaveBeenCalled();

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data).toEqual({ indexName: 'theIndex', status: ReindexStatus.inProgress });
    });

    it('returns a 403 if required privileges fails', async () => {
      mockReindexService.hasRequiredPrivileges.mockResolvedValueOnce(false);

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: { indexName: 'theIndex' },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(403);
    });
  });

  describe('POST /api/upgrade_assistant/reindex/{indexName}/cancel', () => {
    it('returns a 501', async () => {
      mockReindexService.cancelReindexing.mockResolvedValueOnce({});

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/{indexName}/cancel',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: { indexName: 'cancelMe' },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({ acknowledged: true });
      expect(mockReindexService.cancelReindexing).toHaveBeenCalledWith('cancelMe');
    });
  });
});
