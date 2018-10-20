/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertService } from './alert_service';

export function alertService(kibana: any) {
  return new kibana.Plugin({
    id: 'alert_service',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'task_manager'],
    configPrefix: 'xpack.alert_service',
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        max_attempts: Joi.number()
          .description(
            'The maximum number of times a alert will be attempted before being abandoned as failed'
          )
          .default(3),
        poll_interval: Joi.number()
          .description('How often, in milliseconds, the alert manager will look for more work.')
          .default(3000),
        index: Joi.string()
          .description('The name of the index used to store alert information.')
          .default('.kibana'),
        max_workers: Joi.number()
          .description(
            'The maximum number of alerts that this Kibana instance will run simultaneously.'
          )
          .default(10),
        override_num_workers: Joi.object()
          .pattern(/.*/, Joi.number().greater(0))
          .description(
            'Customize the number of workers occupied by specific alerts (e.g. override_num_workers.reporting: 2)'
          )
          .default({}),
      }).default();
    },
    preInit(server: any) {
      const config = server.config();
      const alerts = new AlertService(this.kbnServer, config);
      server.decorate('server', 'alertService', alerts);
    },
  });
}
