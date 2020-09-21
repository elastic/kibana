/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line import/no-extraneous-dependencies
require('@babel/register')({
  extensions: ['.js'],
  plugins: [],
  presets: [
    '@babel/typescript',
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
});

// eslint-disable-next-line import/no-extraneous-dependencies
const { run } = require('jest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const config = require('../jest.config.js');

const argv = [...process.argv.slice(2), '--config', JSON.stringify(config)];

run(argv);
