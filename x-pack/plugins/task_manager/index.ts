/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import {
  Logger,
  TaskDefinition,
  TaskDictionary,
  TaskManager,
  TaskPool,
  TaskStore,
  validateTaskDefinition,
} from './task_pool';

export function taskManager(kibana: any) {
  return new kibana.Plugin({
    id: 'taskManager',

    configPrefix: 'xpack.task_manager',

    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config() {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        max_attempts: Joi.number()
          .description(
            'The maximum number of times a task will be attempted before being abandoned as failed'
          )
          .default(3),
        poll_interval: Joi.number()
          .description('How often, in milliseconds, the task manager will look for more work.')
          .default(30000),
        index: Joi.string()
          .description('The name of the index used to store task information.')
          .default('.kibana_task_manager'),
        max_concurrency: Joi.number()
          .description(
            'The maximum number of tasks that this Kibana instance will run simultaneously.'
          )
          .default(10),
      }).default();
    },

    async init(server: any) {
      const config = server.config();
      const logger = new Logger((...args) => server.log(...args));
      const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
      const maxConcurrency = config.get('xpack.task_manager.max_concurrency');
      const store = new TaskStore({
        index: config.get('xpack.task_manager.index'),
        callCluster,
        maxAttempts: config.get('xpack.task_manager.max_attempts'),
      });

      logger.debug('Initializing the task manager index');
      await store.init();

      const definitions = extractTaskDefinitions(logger, this.kbnServer.plugins, maxConcurrency);

      const pool = new TaskPool({
        logger,
        callCluster,
        pollInterval: config.get('xpack.task_manager.poll_interval'),
        maxConcurrency,
        store,
        definitions,
      });

      pool.start();

      server.decorate(
        'server',
        'taskManager',
        new TaskManager({
          store,
          pool,
        })
      );
    },
  });
}

// TODO, move this to a file and properly test it, validate the taskDefinition via Joi or something
function extractTaskDefinitions(logger: Logger, plugins: any[], maxConcurrency: number) {
  function mergeTaskDefinitions(definitions: TaskDictionary, { id, taskDefinitions }: any) {
    if (!taskDefinitions) {
      return definitions;
    }

    Object.keys(taskDefinitions).forEach(k => {
      if (definitions[k]) {
        throw new Error(`Duplicate task definition "${k}" in plugin "${id}"`);
      }

      logger.debug(`Registering task "${k}" from plugin "${id}".`);
      const definition = Joi.attempt(taskDefinitions[k], validateTaskDefinition) as TaskDefinition;
      definitions[k] = {
        ...definition,
        maxConcurrency: definition.maxConcurrency || maxConcurrency,
      };
    });

    return definitions;
  }

  return plugins.reduce(mergeTaskDefinitions, {});
}
