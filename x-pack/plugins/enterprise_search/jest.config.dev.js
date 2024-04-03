/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../',
  projects: [
    '<rootDir>/x-pack/plugins/enterprise_search/public/**/jest.config.js',
    '<rootDir>/x-pack/plugins/enterprise_search/common/**/jest.config.js',
    '<rootDir>/x-pack/plugins/enterprise_search/server/**/jest.config.js',
  ],
};
