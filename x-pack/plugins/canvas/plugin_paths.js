/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolve } from 'path';

export const pluginPaths = {
  serverFunctions: resolve(__dirname, 'canvas_plugin/functions/server'),
  browserFunctions: resolve(__dirname, 'canvas_plugin/functions/browser'),
  commonFunctions: resolve(__dirname, 'canvas_plugin/functions/common'),
  types: resolve(__dirname, 'canvas_plugin/types'),
  elements: resolve(__dirname, 'canvas_plugin/elements'),
  renderers: resolve(__dirname, 'canvas_plugin/renderers'),
  interfaces: resolve(__dirname, 'canvas_plugin/interfaces'),
  transformUIs: resolve(__dirname, 'canvas_plugin/uis/transforms'),
  datasourceUIs: resolve(__dirname, 'canvas_plugin/uis/datasources'),
  modelUIs: resolve(__dirname, 'canvas_plugin/uis/models'),
  viewUIs: resolve(__dirname, 'canvas_plugin/uis/views'),
  argumentUIs: resolve(__dirname, 'canvas_plugin/uis/arguments'),
};
