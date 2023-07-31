/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/x-pack/plugins/security_solution_serverless/server/cloud_security'],
  // coverageDirectory:
  //   '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/security_solution_serverless/server',
  // coverageReporters: ['text', 'html'],
  // collectCoverageFrom: [
  //   '<rootDir>/x-pack/plugins/security_solution_serverless/server/**/*.{ts,tsx}',
  // ],
};
