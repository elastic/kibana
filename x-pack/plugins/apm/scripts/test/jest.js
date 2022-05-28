/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/optimizer').registerNodeAutoTranspilation();

// eslint-disable-next-line import/no-extraneous-dependencies
const { run } = require('jest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const config = require('../../jest.config');

const argv = [...process.argv.slice(2), '--config', JSON.stringify(config)];

run(argv);
