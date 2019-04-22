/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This is the Rollup job we will be creating in our tests
export const JOB_TO_CREATE = {
  id: 'test-job',
  indexPattern: 'test-pattern-*',
  rollupIndex: 'rollup-index',
  interval: '24h'
};
