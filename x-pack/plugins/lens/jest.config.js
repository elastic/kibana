/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/lens'],

  // TODO: migrate to "jest-environment-jsdom" https://github.com/elastic/kibana/issues/95202
  testEnvironment: 'jest-environment-jsdom-thirteen',
};
