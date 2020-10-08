/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

const DLL_NAME = 'canvas_storybook_dll';
const KIBANA_ROOT = path.resolve(__dirname, '../../../..');
const DLL_OUTPUT = path.resolve(KIBANA_ROOT, 'built_assets', DLL_NAME);

module.exports = {
  DLL_NAME,
  KIBANA_ROOT,
  DLL_OUTPUT,
};
