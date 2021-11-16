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

import { credentialStoreFactory } from '../../lib/reindexing/credential_store';
import { registerBatchReindexIndicesRoutes } from './batch_reindex_indices';

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
    registerBatchReindexIndicesRoutes(routeDependencies, () => worker);

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
});
