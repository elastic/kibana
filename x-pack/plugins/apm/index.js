/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initTransactionsApi } from './server/routes/transactions';
import { initServicesApi } from './server/routes/services';
import { initErrorsApi } from './server/routes/errors';
import { initStatusApi } from './server/routes/status_check';

export function apm(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'apm',
    configPrefix: 'xpack.apm',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: 'APM',
        description: 'APM for the Elastic Stack',
        main: 'plugins/apm/index',
        icon: 'plugins/apm/icon.svg'
      },
      home: ['plugins/apm/register_feature'],
      injectDefaultVars(server) {
        const config = server.config();
        return {
          apmUiEnabled: config.get('xpack.apm.ui.enabled'),
          apmIndexPattern: config.get('xpack.apm.indexPattern')
        };
      },
      hacks: ['plugins/apm/hacks/toggle_app_link_in_nav']
    },

    config(Joi) {
      return Joi.object({
        ui: Joi.object({
          enabled: Joi.boolean().default(true)
        }).default(),
        enabled: Joi.boolean().default(true),
        indexPattern: Joi.string().default('apm*'),
        minimumBucketSize: Joi.number().default(15),
        bucketTargetCount: Joi.number().default(27)
      }).default();
    },

    init(server) {
      initTransactionsApi(server);
      initServicesApi(server);
      initErrorsApi(server);
      initStatusApi(server);
    }
  });
}
