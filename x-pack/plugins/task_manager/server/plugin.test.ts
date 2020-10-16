/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManagerPlugin } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { TaskManagerConfig } from './config';

describe('TaskManagerPlugin', () => {
  describe('setup', () => {
    test('throws if no valid UUID is available', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        enabled: true,
        max_workers: 10,
        index: 'foo',
        max_attempts: 9,
        poll_interval: 3000,
        max_poll_inactivity_cycles: 10,
        request_capacity: 1000,
      });

      pluginInitializerContext.env.instanceUuid = '';

      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);
      expect(taskManagerPlugin.setup(coreMock.createSetup())).rejects.toEqual(
        new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`)
      );
    });

    test('throws if setup methods are called after start', async () => {
      const pluginInitializerContext = coreMock.createPluginInitializerContext<TaskManagerConfig>({
        enabled: true,
        max_workers: 10,
        index: 'foo',
        max_attempts: 9,
        poll_interval: 3000,
        max_poll_inactivity_cycles: 10,
        request_capacity: 1000,
      });

      const taskManagerPlugin = new TaskManagerPlugin(pluginInitializerContext);

      const setupApi = await taskManagerPlugin.setup(coreMock.createSetup());

      await taskManagerPlugin.start(coreMock.createStart());

      expect(() =>
        setupApi.addMiddleware({
          beforeSave: async (saveOpts) => saveOpts,
          beforeRun: async (runOpts) => runOpts,
          beforeMarkRunning: async (runOpts) => runOpts,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot add Middleware after the task manager has started"`
      );

      expect(() =>
        setupApi.registerTaskDefinitions({
          lateRegisteredType: {
            title: 'lateRegisteredType',
            createTaskRunner: () => ({ async run() {} }),
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register task definitions after the task manager has started"`
      );
    });
  });
});
