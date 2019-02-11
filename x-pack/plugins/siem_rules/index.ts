/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { RulesService } from './rules_service';

export function siemRules(kibana: any) {
  return new kibana.Plugin({
    id: 'siem_rules',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'task_manager'],
    configPrefix: 'xpack.siem_rules',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'SIEM Rules',
        description: 'SIEM Rules',
        main: 'plugins/siem_rules/app',
      },
    },
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    init(server: any) {
      const rules = new RulesService(this.kbnServer);
      server.expose('siem_rules', rules);
    },
  });
}
