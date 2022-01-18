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
      const { registerMetric, getMetrics } = plugin.setup(coreSetup);
      registerMetric({
        type: 'test',
        fetch: async () => {
          return [
            {
              name: 'foo',
            },
          ];
        },
      });

      const metrics = await getMetrics();
      expect(metrics).toStrictEqual({ test: [{ name: 'foo' }] });
    });

    it('should allow registering multiple ollectors and getting data from it', async () => {
      const { registerMetric, getMetrics } = plugin.setup(coreSetup);
      registerMetric({
        type: 'test',
        fetch: async () => {
          return [
            {
              name: 'foo',
            },
          ];
        },
      });
      registerMetric({
        type: 'tester',
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

      const metrics = await getMetrics();
      expect(metrics).toStrictEqual({
        test: [{ name: 'foo' }],
        tester: [{ name: 'foo' }, { name: 'bar' }, { name: 'foobar' }],
      });
    });
  });
});
