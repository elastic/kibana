/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { initServerWithKibana } from './server';

export const uptimeMonitoring = (kibana: any) =>
  new kibana.Plugin({
    configPrefix: 'xpack.uptime_monitoring',
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        description: 'Monitor your endpoints',
        icon: 'plugins/uptime_monitoring/icons/heartbeat_white.svg',
        title: 'Uptime Monitoring',
        main: 'plugins/uptime_monitoring/app',
        url: '/app/uptime_monitoring#/home',
      },
      home: ['plugins/uptime_monitoring/register_feature'],
    },
    init(server: Server) {
      initServerWithKibana(server);
    },
  });
