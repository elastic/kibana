/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PLUGIN_ID } from './common';
import { route as routeSql } from './server/essql';
import { route as routeQuery } from './server/query';

export function vizEditor(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      app: {
        title: 'Viz Editor',
        description: 'Explore and visualize data.',
        main: `plugins/${PLUGIN_ID}/app`,
        icon: 'plugins/kibana/assets/visualize.svg',
        euiIconType: 'visualizeApp',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },

    config(joi: Joi.Root) {
      return joi
        .object({
          enabled: joi.boolean().default(true),
        })
        .default();
    },

    init(server: Legacy.Server) {
      // TODO these injections are only here to support the legacy chart renderers (kibana_pie, kibana_gauge, ...)
      // When we switch to elastic-charts completely, they can be removed
      server.injectUiAppVars(PLUGIN_ID, async () => {
        return await (server as any).getInjectedUiAppVars('kibana');
      });

      routeQuery(server);
      routeSql(server);
    },
  });
}
