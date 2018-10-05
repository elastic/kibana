/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager } from './task_manager';

export function taskManager(kibana) {
  return new kibana.Plugin({
    id: 'task_manager',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.task_manager',
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        max_attempts: Joi.number()
          .description('The maximum number of times a task will be attempted before being abandoned as failed')
          .default(3),
        poll_interval: Joi.number()
          .description('How often, in milliseconds, the task manager will look for more work.')
          .default(3000),
        index: Joi.string()
          .description('The name of the index used to store task information.')
          .default('.kibana_task_manager'),
        max_workers: Joi.number()
          .description('The maximum number of tasks that this Kibana instance will run simultaneously.')
          .default(10),
        override_num_workers: Joi.object()
          .pattern(/.*/, Joi.number().greater(0))
          .description('Customize the number of workers occupied by specific tasks (e.g. override_num_workers.reporting: 2)')
          .default({})
      }).default();
    },
    preInit(server) {
      const config = server.config();
      const taskManager = new TaskManager(this.kbnServer, server, config);
      server.decorate('server', 'taskManager', taskManager);
    },
  });
}
