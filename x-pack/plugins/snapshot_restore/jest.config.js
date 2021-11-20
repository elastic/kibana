/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/snapshot_restore'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/snapshot_restore',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/snapshot_restore/{common,public,server}/**/*.{ts,tsx}',
  ],
};
