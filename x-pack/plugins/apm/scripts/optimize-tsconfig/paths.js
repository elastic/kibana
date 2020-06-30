/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const path = require('path');

const xpackRoot = path.resolve(__dirname, '../../../..');
const kibanaRoot = path.resolve(xpackRoot, '..');

const tsconfigTpl = path.resolve(__dirname, './tsconfig.json');

const filesToIgnore = [
  path.resolve(xpackRoot, 'tsconfig.json'),
  path.resolve(kibanaRoot, 'tsconfig.json'),
];

module.exports = {
  xpackRoot,
  kibanaRoot,
  tsconfigTpl,
  filesToIgnore,
};
