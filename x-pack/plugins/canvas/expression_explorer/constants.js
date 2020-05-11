/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

const EXPRESSION_EXPLORER_NAME = 'expression_explorer';
const COMPONENT_NAME = 'ExpressionExplorer';

const KIBANA_ROOT_PATH = '../../../..';
const CANVAS_ROOT_PATH = 'x-pack/plugins/canvas';
const EXPRESSION_EXPLORER_PATH = 'expression_explorer';
const EXPRESSION_EXPLORER_OUTPUT_PATH = 'expression_explorer/build';
const EXPRESSION_EXPLORER_FILE_PATH = 'expression_explorer/build/expression_explorer.js';
const STATS_OUTPUT_PATH = 'expression_explorer/build/webpack_stats.json';

const KIBANA_ROOT = path.resolve(__dirname, KIBANA_ROOT_PATH);
const CANVAS_ROOT = path.resolve(KIBANA_ROOT, CANVAS_ROOT_PATH);
const EXPRESSION_EXPLORER_SRC = path.resolve(CANVAS_ROOT, EXPRESSION_EXPLORER_PATH);
const EXPRESSION_EXPLORER_OUTPUT = path.resolve(CANVAS_ROOT, EXPRESSION_EXPLORER_OUTPUT_PATH);
const EXPRESSION_EXPLORER_FILE = path.resolve(CANVAS_ROOT, EXPRESSION_EXPLORER_FILE_PATH);
const STATS_OUTPUT = path.resolve(CANVAS_ROOT, STATS_OUTPUT_PATH);

module.exports = {
  KIBANA_ROOT,
  COMPONENT_NAME,
  EXPRESSION_EXPLORER_FILE,
  EXPRESSION_EXPLORER_NAME,
  EXPRESSION_EXPLORER_OUTPUT,
  EXPRESSION_EXPLORER_SRC,
  STATS_OUTPUT,
};
