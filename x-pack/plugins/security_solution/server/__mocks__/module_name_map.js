/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// See: https://github.com/elastic/kibana/issues/117255, this moduleNameMapper creates
// mocks to avoid memory leaks from kibana core.
module.exports = {
  '^@kbn/core/server$': '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/core.mock.ts',
  '^@kbn/task-manager-plugin/server$':
    '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/task_manager.mock.ts',
  '^@kbn/alerting-plugin/server$':
    '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/alert.mock.ts',
  '^@kbn/actions-plugin/server$':
    '<rootDir>/x-pack/plugins/security_solution/server/__mocks__/action.mock.ts',
};
