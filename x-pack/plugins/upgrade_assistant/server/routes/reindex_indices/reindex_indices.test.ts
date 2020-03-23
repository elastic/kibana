/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { licensingMock } from '../../../../licensing/server/mocks';
import { createMockRouter, MockRouter, routeHandlerContextMock } from '../__mocks__/routes.mock';
import { createRequestMock } from '../__mocks__/request.mock';

const mockReindexService = {
  hasRequiredPrivileges: jest.fn(),
  detectReindexWarnings: jest.fn(),
  getIndexGroup: jest.fn(),
  createReindexOperation: jest.fn(),
  findAllInProgressOperations: jest.fn(),
  findReindexOperation: jest.fn(),
  processNextStep: jest.fn(),
  resumeReindexOperation: jest.fn(),
  cancelReindexing: jest.fn(),
};
jest.mock('../../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

jest.mock('../../lib/reindexing', () => {
  return {
    reindexServiceFactory: () => mockReindexService,
  };
});

import {
  IndexGroup,
  ReindexSavedObject,
  ReindexStatus,
  ReindexWarning,
} from '../../../common/types';
import { credentialStoreFactory } from '../../lib/reindexing/credential_store';
import { registerReindexIndicesRoutes } from './reindex_indices';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('reindex API', () => {
  let routeDependencies: any;
  let mockRouter: MockRouter;

  const credentialStore = credentialStoreFactory();
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
    };
    registerReindexIndicesRoutes(routeDependencies, () => worker);

    mockReindexService.hasRequiredPrivileges.mockResolvedValue(true);
    mockReindexService.detectReindexWarnings.mockReset();
    mockReindexService.getIndexGroup.mockReset();
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
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce([ReindexWarning.allField]);

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
      expect(data.warnings).toEqual([0]);
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
      expect(data.reindexOp).toBeNull();
      expect(data.warnings).toBeNull();
    });

    it('returns the indexGroup for ML indices', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce([]);
      mockReindexService.getIndexGroup.mockReturnValue(IndexGroup.ml);

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
      expect(data.indexGroup).toEqual(IndexGroup.ml);
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

  describe('POST /api/upgrade_assistant/reindex/batch', () => {
    const queueSettingsArg = {
      enqueue: true,
    };
    it('creates a collection of index operations', async () => {
      mockReindexService.createReindexOperation
        .mockResolvedValueOnce({
          attributes: { indexName: 'theIndex1' },
        })
        .mockResolvedValueOnce({
          attributes: { indexName: 'theIndex2' },
        })
        .mockResolvedValueOnce({
          attributes: { indexName: 'theIndex3' },
        });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/batch',
      })(
        routeHandlerContextMock,
        createRequestMock({ body: { indexNames: ['theIndex1', 'theIndex2', 'theIndex3'] } }),
        kibanaResponseFactory
      );

      // It called create correctly
      expect(mockReindexService.createReindexOperation).toHaveBeenNthCalledWith(
        1,
        'theIndex1',
        queueSettingsArg
      );
      expect(mockReindexService.createReindexOperation).toHaveBeenNthCalledWith(
        2,
        'theIndex2',
        queueSettingsArg
      );
      expect(mockReindexService.createReindexOperation).toHaveBeenNthCalledWith(
        3,
        'theIndex3',
        queueSettingsArg
      );

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data).toEqual({
        errors: [],
        enqueued: [
          { indexName: 'theIndex1' },
          { indexName: 'theIndex2' },
          { indexName: 'theIndex3' },
        ],
      });
    });

    it('gracefully handles partial successes', async () => {
      mockReindexService.createReindexOperation
        .mockResolvedValueOnce({
          attributes: { indexName: 'theIndex1' },
        })
        .mockRejectedValueOnce(new Error('oops!'));

      mockReindexService.hasRequiredPrivileges
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/reindex/batch',
      })(
        routeHandlerContextMock,
        createRequestMock({ body: { indexNames: ['theIndex1', 'theIndex2', 'theIndex3'] } }),
        kibanaResponseFactory
      );

      // It called create correctly
      expect(mockReindexService.createReindexOperation).toHaveBeenCalledTimes(2);
      expect(mockReindexService.createReindexOperation).toHaveBeenNthCalledWith(
        1,
        'theIndex1',
        queueSettingsArg
      );
      expect(mockReindexService.createReindexOperation).toHaveBeenNthCalledWith(
        2,
        'theIndex3',
        queueSettingsArg
      );

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data).toEqual({
        errors: [
          {
            indexName: 'theIndex2',
            message: 'You do not have adequate privileges to reindex "theIndex2".',
          },
          { indexName: 'theIndex3', message: 'oops!' },
        ],
        enqueued: [{ indexName: 'theIndex1' }],
      });
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
