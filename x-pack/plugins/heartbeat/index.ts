/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { initServerWithKibana } from './server';

export const heartbeat = (kibana: any) =>
  new kibana.Plugin({
    configPrefix: 'xpack.heartbeat',
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        description: 'Monitor your endpoints',
        icon: 'plugins/heartbeat/icons/heartbeat_white.svg',
        title: 'Heartbeat',
        main: 'plugins/heartbeat/app',
        url: '/app/heartbeat#/home',
      },
      home: ['plugins/heartbeat/register_feature'],
    },
    init(server: Server) {
      initServerWithKibana(server);
    },
  });
