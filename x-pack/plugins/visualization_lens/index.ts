/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { Server } from 'hapi';
import { resolve } from 'path';

import { PLUGIN_ID } from './common';

const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';

export const visualizationLens = (kibana: any) => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter'],
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
        description: 'Explore and visualize data.',
        main: `plugins/${PLUGIN_ID}/app`,
        icon: 'plugins/kibana/assets/visualize.svg',
        euiIconType: 'visualizeApp',
        order: 8950, // Uptime is 8900
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },

    config: () => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: Server) {},
  });
};

export { editorFrame } from './public';
