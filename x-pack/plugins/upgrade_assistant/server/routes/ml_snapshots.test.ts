/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';

import { errors as esErrors } from '@elastic/elasticsearch';
import { handleEsError } from '../shared_imports';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerMlSnapshotRoutes } from './ml_snapshots';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: <P, Q, B>(handler: RequestHandler<P, Q, B>) => handler,
}));

const JOB_ID = 'job_id';
const SNAPSHOT_ID = 'snapshot_id';
const NODE_ID = 'node_id';

describe('ML snapshots APIs', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerMlSnapshotRoutes(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/upgrade_assistant/ml_snapshots', () => {
    it('returns 200 status and in_progress status', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .upgradeJobSnapshot as jest.Mock
      ).mockResolvedValue({
        node: NODE_ID,
        completed: false,
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/ml_snapshots',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            snapshotId: SNAPSHOT_ID,
            jobId: JOB_ID,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        jobId: JOB_ID,
        nodeId: NODE_ID,
        snapshotId: SNAPSHOT_ID,
        status: 'in_progress',
      });
    });

    it('returns 200 status and complete status', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .upgradeJobSnapshot as jest.Mock
      ).mockResolvedValue({
        node: NODE_ID,
        completed: true,
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/ml_snapshots',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            snapshotId: SNAPSHOT_ID,
            jobId: JOB_ID,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        jobId: JOB_ID,
        nodeId: NODE_ID,
        snapshotId: SNAPSHOT_ID,
        status: 'complete',
      });
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .upgradeJobSnapshot as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'post',
          pathPattern: '/api/upgrade_assistant/ml_snapshots',
        })(
          routeHandlerContextMock,
          createRequestMock({
            body: {
              snapshotId: SNAPSHOT_ID,
              jobId: JOB_ID,
            },
          }),
          kibanaResponseFactory
        )
      ).rejects.toThrow('scary error!');
    });
  });

  describe('DELETE /api/upgrade_assistant/ml_snapshots/:jobId/:snapshotId', () => {
    it('returns 200 status', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .deleteModelSnapshot as jest.Mock
      ).mockResolvedValue({ acknowledged: true });

      const resp = await routeDependencies.router.getHandler({
        method: 'delete',
        pathPattern: '/api/upgrade_assistant/ml_snapshots/{jobId}/{snapshotId}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: { snapshotId: 'snapshot_id1', jobId: 'job_id1' },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        acknowledged: true,
      });
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .deleteModelSnapshot as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'delete',
          pathPattern: '/api/upgrade_assistant/ml_snapshots/{jobId}/{snapshotId}',
        })(
          routeHandlerContextMock,
          createRequestMock({
            params: { snapshotId: 'snapshot_id1', jobId: 'job_id1' },
          }),
          kibanaResponseFactory
        )
      ).rejects.toThrow('scary error!');
    });
  });

  describe('GET /api/upgrade_assistant/ml_upgrade_mode', () => {
    it('Retrieves ml upgrade mode', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml.info as jest.Mock
      ).mockResolvedValue({
        upgrade_mode: true,
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_upgrade_mode',
      })(routeHandlerContextMock, createRequestMock({}), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        mlUpgradeModeEnabled: true,
      });
    });
  });

  describe('GET /api/upgrade_assistant/ml_snapshots/:jobId/:snapshotId', () => {
    it('returns "idle" status if saved object does not exist', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .getModelSnapshots as jest.Mock
      ).mockResolvedValue({
        count: 1,
        model_snapshots: [
          {
            job_id: JOB_ID,
            min_version: '6.4.0',
            timestamp: 1575402237000,
            description: 'State persisted due to job close at 2019-12-03T19:43:57+0000',
            snapshot_id: SNAPSHOT_ID,
            snapshot_doc_count: 1,
            model_size_stats: {},
            latest_record_time_stamp: 1576971072000,
            latest_result_time_stamp: 1576965600000,
            retain: false,
          },
        ],
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_snapshots/{jobId}/{snapshotId}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: {
            snapshotId: SNAPSHOT_ID,
            jobId: JOB_ID,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        jobId: JOB_ID,
        nodeId: undefined,
        snapshotId: SNAPSHOT_ID,
        status: 'idle',
      });
    });

    it('returns "in_progress" status if snapshot upgrade is in progress', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .getModelSnapshots as jest.Mock
      ).mockResolvedValue({
        count: 1,
        model_snapshots: [
          {
            job_id: JOB_ID,
            min_version: '6.4.0',
            timestamp: 1575402237000,
            description: 'State persisted due to job close at 2019-12-03T19:43:57+0000',
            snapshot_id: SNAPSHOT_ID,
            snapshot_doc_count: 1,
            model_size_stats: {},
            latest_record_time_stamp: 1576971072000,
            latest_result_time_stamp: 1576965600000,
            retain: false,
          },
        ],
      });

      (routeHandlerContextMock.core.savedObjects.client.find as jest.Mock).mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            attributes: {
              nodeId: NODE_ID,
              jobId: JOB_ID,
              snapshotId: SNAPSHOT_ID,
            },
          },
        ],
      });

      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockResolvedValue({
        body: {
          model_snapshot_upgrades: [
            {
              state: 'loading_old_state',
            },
          ],
        },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_snapshots/{jobId}/{snapshotId}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: {
            snapshotId: SNAPSHOT_ID,
            jobId: JOB_ID,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        jobId: JOB_ID,
        nodeId: NODE_ID,
        snapshotId: SNAPSHOT_ID,
        status: 'in_progress',
      });
    });

    it('fails when snapshot upgrade status returns has status="failed"', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .getModelSnapshots as jest.Mock
      ).mockResolvedValue({
        count: 1,
        model_snapshots: [
          {
            job_id: JOB_ID,
            min_version: '6.4.0',
            timestamp: 1575402237000,
            description: 'State persisted due to job close at 2019-12-03T19:43:57+0000',
            snapshot_id: SNAPSHOT_ID,
            snapshot_doc_count: 1,
            model_size_stats: {},
            latest_record_time_stamp: 1576971072000,
            latest_result_time_stamp: 1576965600000,
            retain: false,
          },
        ],
      });

      (routeHandlerContextMock.core.savedObjects.client.find as jest.Mock).mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            attributes: {
              nodeId: NODE_ID,
              jobId: JOB_ID,
              snapshotId: SNAPSHOT_ID,
            },
          },
        ],
      });

      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockResolvedValue({
        body: {
          model_snapshot_upgrades: [
            {
              state: 'failed',
            },
          ],
        },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_snapshots/{jobId}/{snapshotId}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: {
            snapshotId: SNAPSHOT_ID,
            jobId: JOB_ID,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(500);
    });

    it('returns "complete" status if snapshot upgrade has completed', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
          .getModelSnapshots as jest.Mock
      ).mockResolvedValue({
        count: 1,
        model_snapshots: [
          {
            job_id: JOB_ID,
            min_version: '6.4.0',
            timestamp: 1575402237000,
            description: 'State persisted due to job close at 2019-12-03T19:43:57+0000',
            snapshot_id: SNAPSHOT_ID,
            snapshot_doc_count: 1,
            model_size_stats: {},
            latest_record_time_stamp: 1576971072000,
            latest_result_time_stamp: 1576965600000,
            retain: false,
          },
        ],
      });

      (routeHandlerContextMock.core.savedObjects.client.find as jest.Mock).mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            attributes: {
              nodeId: NODE_ID,
              jobId: JOB_ID,
              snapshotId: SNAPSHOT_ID,
            },
          },
        ],
      });

      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockRejectedValue(new esErrors.ResponseError({ statusCode: 404 } as any));

      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.migration
          .deprecations as jest.Mock
      ).mockResolvedValue({
        cluster_settings: [],
        ml_settings: [],
        node_settings: [],
        index_settings: {},
      });

      (routeHandlerContextMock.core.savedObjects.client.delete as jest.Mock).mockResolvedValue({});

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_snapshots/{jobId}/{snapshotId}',
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: {
            snapshotId: SNAPSHOT_ID,
            jobId: JOB_ID,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        jobId: JOB_ID,
        nodeId: NODE_ID,
        snapshotId: SNAPSHOT_ID,
        status: 'complete',
      });
    });
  });
});
