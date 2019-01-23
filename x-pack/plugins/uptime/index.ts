/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { initServerWithKibana } from './server';

export const uptime = (kibana: any) =>
  new kibana.Plugin({
    configPrefix: 'xpack.uptime',
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        description: i18n.translate('xpack.uptime.pluginDescription', {
          defaultMessage: 'Uptime monitoring',
          description: 'The description text that will be shown to users in Kibana',
        }),
        icon: 'plugins/uptime/icons/heartbeat_white.svg',
        title: 'Uptime',
        main: 'plugins/uptime/app',
        order: 8900,
        url: '/app/uptime#/',
      },
      home: ['plugins/uptime/register_feature'],
    },
    init(server: Server) {
      initServerWithKibana(server);
    },
  });
