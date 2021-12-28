/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../',
  projects: [
    '<rootDir>/x-pack/plugins/cloud_security_posture/server/jest.config.js',
    '<rootDir>/x-pack/plugins/cloud_security_posture/public/jest.config.js',
  ],
};
