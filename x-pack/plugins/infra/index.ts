/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import JoiNamespace from 'joi';
import { resolve } from 'path';

import { getConfigSchema, initServerWithKibana, KbnServer } from './server/kibana.index';

const APP_ID = 'infra';

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.infra',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        description: 'Explore your infrastructure',
        icon: 'plugins/infra/images/infra_mono_white.svg',
        main: 'plugins/infra/app',
        title: 'InfraOps',
        listed: false,
        url: `/app/${APP_ID}#/home`,
      },
      home: ['plugins/infra/register_feature'],
      links: [
        {
          description: 'Explore your infrastructure',
          icon: 'plugins/infra/images/infra_mono_white.svg',
          euiIconType: 'infraApp',
          id: 'infra:home',
          order: 8000,
          title: 'Infra Ops',
          url: `/app/${APP_ID}#/home`,
        },
        {
          description: 'Explore your logs',
          icon: 'plugins/infra/images/logging_mono_white.svg',
          euiIconType: 'loggingApp',
          id: 'infra:logs',
          order: 8001,
          title: 'Logs',
          url: `/app/${APP_ID}#/logs`,
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
