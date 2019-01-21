/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');
const storybook = require('@storybook/react/standalone');

storybook({
  mode: 'static',
  configDir: path.resolve(__dirname, './../.storybook'),
  outputDir: path.resolve(__dirname, './../storybook'),
});
