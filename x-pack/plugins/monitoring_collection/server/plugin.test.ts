/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '../../../../src/core/server/mocks';
import { MonitoringCollectionPlugin } from './plugin';

describe('monitoring_collection plugin', () => {
  describe('setup()', () => {
    let context: ReturnType<typeof coreMock['createPluginInitializerContext']>;
    let plugin: MonitoringCollectionPlugin;
    let coreSetup: ReturnType<typeof coreMock['createSetup']>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      plugin = new MonitoringCollectionPlugin(context);
      coreSetup = coreMock.createSetup();
      coreSetup.getStartServices = jest.fn().mockResolvedValue([
        {
          application: {},
        },
        { triggersActionsUi: {} },
      ]);
    });

    it('should allow registering a collector and getting data from it', async () => {
      const { registerMetric } = plugin.setup(coreSetup);
      registerMetric<{ name: string }>({
        type: 'cluster_actions',
        schema: {
          name: {
            type: 'text',
          },
        },
        fetch: async () => {
          return [
            {
              name: 'foo',
            },
          ];
        },
      });

      const metrics = await plugin.getMetric('cluster_actions');
      expect(metrics).toStrictEqual([{ name: 'foo' }]);
    });

    it('should allow registering multiple ollectors and getting data from it', async () => {
      const { registerMetric } = plugin.setup(coreSetup);
      registerMetric<{ name: string }>({
        type: 'cluster_actions',
        schema: {
          name: {
            type: 'text',
          },
        },
        fetch: async () => {
          return [
            {
              name: 'foo',
            },
          ];
        },
      });
      registerMetric<{ name: string }>({
        type: 'cluster_rules',
        schema: {
          name: {
            type: 'text',
          },
        },
        fetch: async () => {
          return [
            {
              name: 'foo',
            },
            {
              name: 'bar',
            },
            {
              name: 'foobar',
            },
          ];
        },
      });

      const metrics = await Promise.all([
        plugin.getMetric('cluster_actions'),
        plugin.getMetric('cluster_rules'),
      ]);
      expect(metrics).toStrictEqual([
        [{ name: 'foo' }],
        [{ name: 'foo' }, { name: 'bar' }, { name: 'foobar' }],
      ]);
    });

    it('should NOT allow registering a collector that is not in the allowlist', async () => {
      const logger = context.logger.get();
      const { registerMetric } = plugin.setup(coreSetup);
      registerMetric<{ name: string }>({
        type: 'test',
        schema: {
          name: {
            type: 'text',
          },
        },
        fetch: async () => {
          return [
            {
              name: 'foo',
            },
          ];
        },
      });
      const metrics = await plugin.getMetric('test');
      expect((logger.warn as jest.Mock).mock.calls.length).toBe(2);
      expect((logger.warn as jest.Mock).mock.calls[0][0]).toBe(
        `Skipping registration of metric type 'test'. This type is not supported in the allowlist.`
      );
      expect((logger.warn as jest.Mock).mock.calls[1][0]).toBe(
        `Call to 'getMetric' failed because type 'test' does not exist.`
      );
      expect(metrics).toBeUndefined();
    });
  });
});
