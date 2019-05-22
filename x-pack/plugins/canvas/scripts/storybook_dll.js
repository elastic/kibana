/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const devUtils = require('@kbn/dev-utils');
const { DLL_OUTPUT } = require('./../.storybook/constants');

const log = new devUtils.ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

if (fs.existsSync(DLL_OUTPUT)) {
  log.info('storybook: DLL exists from previous build');
} else {
  log.info('storybook: DLL missing; building');
  execa.sync(
    'yarn',
    [
      'webpack',
      '--config',
      'x-pack/plugins/canvas/.storybook/webpack.dll.config.js',
      '--progress',
      '--hide-modules',
      '--display-entrypoints',
      'false',
    ],
    {
      cwd: path.resolve(__dirname, '../../../..'),
      stdio: ['ignore', 'inherit', 'inherit'],
      buffer: false,
    }
  );
  log.success('storybook: DLL built');
}
