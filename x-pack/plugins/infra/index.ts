/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';
import { resolve } from 'path';

import { getConfigSchema, initServerWithKibana } from './server/kibana.index';

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: 'infra',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        description: 'Explore your infrastructure',
        icon: 'plugins/infra/images/infra.svg',
        main: 'plugins/infra/app',
        title: 'Infra',
      },
    },
    config(Joi: typeof JoiNamespace) {
      return getConfigSchema(Joi);
    },
    init(plugin: Server) {
      initServerWithKibana(plugin);
    },
  });
}
