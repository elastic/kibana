/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'chat',
  testFiles: [
    require.resolve('../../test_suites/core'),
    require.resolve('../../test_suites/elasticsearch_api'),
  ],
  junit: {
    reportName: 'Serverless Chat Platform API Integration Tests - Common Group 1',
  },
  suiteTags: { exclude: ['skipSvlChat'] },

  // include settings from project controller
  esServerArgs: [],
  kbnServerArgs: [],
});
