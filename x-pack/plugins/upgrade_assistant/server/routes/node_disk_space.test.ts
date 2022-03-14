/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { handleEsError } from '../shared_imports';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerNodeDiskSpaceRoute } from './node_disk_space';

describe('Disk space API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerNodeDiskSpaceRoute(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/node_disk_space', () => {
    beforeEach(() => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.nodes.stats as jest.Mock
      ).mockResolvedValue({
        nodes: {
          '1YOaoS9lTNOiTxR1uzSgRA': {
            name: 'node_name',
            fs: {
              total: {
                // Keeping these numbers (inaccurately) small so it's easier to reason the math when scanning through :)
                total_in_bytes: 100,
                available_in_bytes: 20,
              },
            },
          },
        },
      });
    });

    it('returns the default low watermark disk usage setting', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          'cluster.routing.allocation.disk.watermark.low': '75%',
        },
        transient: {},
        persistent: {},
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/node_disk_space',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual([
        {
          nodeName: 'node_name',
          nodeId: '1YOaoS9lTNOiTxR1uzSgRA',
          available: '20%',
          lowDiskWatermarkSetting: '75%',
        },
      ]);
    });

    it('returns the persistent low watermark disk usage setting', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {},
        transient: {},
        persistent: { 'cluster.routing.allocation.disk.watermark.low': '75%' },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/node_disk_space',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual([
        {
          nodeName: 'node_name',
          nodeId: '1YOaoS9lTNOiTxR1uzSgRA',
          available: '20%',
          lowDiskWatermarkSetting: '75%',
        },
      ]);
    });

    it('returns the transient low watermark disk usage setting', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {},
        transient: { 'cluster.routing.allocation.disk.watermark.low': '80%' },
        persistent: { 'cluster.routing.allocation.disk.watermark.low': '85%' },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/node_disk_space',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual([
        {
          nodeName: 'node_name',
          nodeId: '1YOaoS9lTNOiTxR1uzSgRA',
          available: '20%',
          lowDiskWatermarkSetting: '80%',
        },
      ]);
    });

    it('returns nodes with low disk space when low watermark disk usage setting is bytes value', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          'cluster.routing.allocation.disk.watermark.low': '80b',
        },
        transient: {},
        persistent: {},
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/node_disk_space',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual([
        {
          nodeName: 'node_name',
          nodeId: '1YOaoS9lTNOiTxR1uzSgRA',
          available: '20%',
          lowDiskWatermarkSetting: '80b',
        },
      ]);
    });

    it('returns empty array if low watermark disk usage setting is undefined', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {},
        transient: {},
        persistent: {},
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/node_disk_space',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual([]);
    });

    it('returns empty array if nodes have not reached low disk usage', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          'cluster.routing.allocation.disk.watermark.low': '10%',
        },
        transient: {},
        persistent: {},
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/node_disk_space',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual([]);
    });

    describe('Error handling', () => {
      it('returns an error if cluster.getSettings throws', async () => {
        (
          routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
            .getSettings as jest.Mock
        ).mockRejectedValue(new Error('scary error!'));
        await expect(
          routeDependencies.router.getHandler({
            method: 'get',
            pathPattern: '/api/upgrade_assistant/node_disk_space',
          })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
        ).rejects.toThrow('scary error!');
      });

      it('returns an error if node.stats throws', async () => {
        (
          routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
            .getSettings as jest.Mock
        ).mockResolvedValue({
          defaults: {
            'cluster.routing.allocation.disk.watermark.low': '85%',
          },
          transient: {},
          persistent: {},
        });

        (
          routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.nodes.stats as jest.Mock
        ).mockRejectedValue(new Error('scary error!'));
        await expect(
          routeDependencies.router.getHandler({
            method: 'get',
            pathPattern: '/api/upgrade_assistant/node_disk_space',
          })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
        ).rejects.toThrow('scary error!');
      });
    });
  });
});
