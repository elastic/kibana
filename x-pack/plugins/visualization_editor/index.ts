/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { resolve } from 'path';
import { PLUGIN_ID } from './common';

export function visualizationEditor(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      app: {
        title: 'Visualization Editor',
        description: 'Explore and visualize data.',
        main: `plugins/${PLUGIN_ID}/index`,
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
  });
}