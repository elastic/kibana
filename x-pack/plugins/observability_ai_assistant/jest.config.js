/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/observability_ai_assistant'],
  setupFiles: ['<rootDir>/x-pack/plugins/observability_ai_assistant/.storybook/jest_setup.js'],
  collectCoverage: true,
  coverageReporters: ['html'],
};
