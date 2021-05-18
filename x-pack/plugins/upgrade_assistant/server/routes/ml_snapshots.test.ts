/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerMlSnapshotRoutes } from './ml_snapshots';

describe('ML snapshots APIs', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
    };
    registerMlSnapshotRoutes(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/upgrade_assistant/ml_snapshots', () => {
    it('returns 200 status', async () => {
      (routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
        .updateModelSnapshot as jest.Mock).mockResolvedValue({
        body: {
          acknowledged: true,
        },
      });
      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/ml_snapshots',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            snapshotId: 'snapshot_id1',
            jobId: 'job_id1',
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        acknowledged: true,
      });
    });

    it('returns an error if it throws', async () => {
      (routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
        .updateModelSnapshot as jest.Mock).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'post',
          pathPattern: '/api/upgrade_assistant/ml_snapshots',
        })(
          routeHandlerContextMock,
          createRequestMock({
            body: {
              snapshotId: 'snapshot_id1',
              jobId: 'job_id1',
            },
          }),
          kibanaResponseFactory
        )
      ).rejects.toThrow('scary error!');
    });
  });

  describe('DELETE /api/upgrade_assistant/ml_snapshots/:jobId/:snapshotId', () => {
    it('returns 200 status', async () => {
      (routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
        .deleteModelSnapshot as jest.Mock).mockResolvedValue({
        body: { acknowledged: true },
      });

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
      (routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.ml
        .deleteModelSnapshot as jest.Mock).mockRejectedValue(new Error('scary error!'));
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
});
