/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const path = require('path');

const kibanaRoot = path.resolve(__dirname, '../../../../..');
const tsconfigTpl = path.resolve(__dirname, './tsconfig.json');
const tsconfigTplTest = path.resolve(__dirname, './test_tsconfig.json');

const filesToIgnore = [
  path.resolve(kibanaRoot, 'tsconfig.json'),
  path.resolve(kibanaRoot, 'tsconfig.base.json'),
  path.resolve(kibanaRoot, 'x-pack/plugins/apm', 'tsconfig.json'),
  path.resolve(kibanaRoot, 'x-pack/plugins/observability', 'tsconfig.json'),
  path.resolve(kibanaRoot, 'x-pack/plugins/rule_registry', 'tsconfig.json'),
  path.resolve(kibanaRoot, 'x-pack/test', 'tsconfig.json'),
];

module.exports = {
  kibanaRoot,
  tsconfigTpl,
  tsconfigTplTest,
  filesToIgnore,
};
