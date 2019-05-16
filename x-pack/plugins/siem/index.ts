/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import JoiNamespace from 'joi';
import { resolve } from 'path';
import { Server } from 'hapi';

import { getConfigSchema, initServerWithKibana } from './server/kibana.index';

const APP_ID = 'siem';
export const APP_NAME = 'SIEM';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function siem(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.siem',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        description: 'Explore your SIEM App',
        main: 'plugins/siem/app',
        euiIconType: 'securityAnalyticsApp',
        title: APP_NAME,
        listed: false,
        url: `/app/${APP_ID}`,
      },
      home: ['plugins/siem/register_feature'],
      links: [
        {
          description: 'Explore your SIEM App',
          euiIconType: 'securityAnalyticsApp',
          id: 'siem',
          order: 9000,
          title: APP_NAME,
          url: `/app/${APP_ID}`,
        },
      ],
    },
    config(Joi: typeof JoiNamespace) {
      return getConfigSchema(Joi);
    },
    init(server: Server) {
      initServerWithKibana(server);
    },
  });
}
