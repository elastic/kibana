/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { AlertService } from './alert_service';

export function alertService(kibana: any) {
  return new kibana.Plugin({
    id: 'alerts',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'task_manager'],
    configPrefix: 'xpack.alerts',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Alerts',
        description: 'Alerting capabilities in Kibana',
        main: 'plugins/alerts/index',
      },
    },
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    init(server: any) {
      const alerts = new AlertService(this.kbnServer);
      server.expose('alerts', alerts);
    },
  });
}
