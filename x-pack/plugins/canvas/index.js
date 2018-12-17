/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import init from './init';
import './server/build_fix';
import { mappings } from './server/mappings';
import { CANVAS_APP } from './common/lib';

export function canvas(kibana) {
  return new kibana.Plugin({
    id: CANVAS_APP,
    configPrefix: 'xpack.canvas',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Canvas',
        description: 'Data driven workpads',
        icon: 'plugins/canvas/icon.svg',
        euiIconType: 'canvasApp',
        main: 'plugins/canvas/app',
      },
      styleSheetPaths: resolve(__dirname, 'public/style/index.scss'),
      hacks: [
        // window.onerror override
        'plugins/canvas/lib/window_error_handler.js',
      ],
      home: ['plugins/canvas/register_feature'],
      mappings,
    },

    config: Joi => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        indexPrefix: Joi.string().default('.canvas'),
      }).default();
    },

    init,
  });
}
