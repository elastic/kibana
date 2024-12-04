/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/canvas'],
  transform: {
    '^.+\\.stories\\.tsx?$': '@storybook/addon-storyshots/injectFileName',
  },
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/canvas',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/canvas/{canvas_plugin_src,common,i18n,public,server,shareable_runtime}/**/*.{js,ts,tsx}',
  ],
  setupFiles: ['<rootDir>/x-pack/plugins/canvas/jest_setup.ts'],
};
