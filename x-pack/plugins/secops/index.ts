/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import JoiNamespace from 'joi';
import { resolve } from 'path';

import { getConfigSchema, initServerWithKibana, KbnServer } from './server/kibana.index';

const APP_ID = 'secops';

// tslint:disable-next-line:no-any
export function secops(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.secops',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        description: 'Explore your security operations',
        main: 'plugins/secops/app',
        euiIconType: 'securityApp',
        title: 'Sec Ops',
        listed: false,
        url: `/app/${APP_ID}`,
      },
      home: ['plugins/secops/register_feature'],
      links: [
        {
          description: 'Explore your security operations',
          euiIconType: 'securityApp',
          id: 'secops',
          order: 9000,
          title: 'Sec Ops',
          url: `/app/${APP_ID}`,
        },
      ],
    },
    config(Joi: typeof JoiNamespace) {
      return getConfigSchema(Joi);
    },
    init(server: KbnServer) {
      initServerWithKibana(server);
    },
  });
}
