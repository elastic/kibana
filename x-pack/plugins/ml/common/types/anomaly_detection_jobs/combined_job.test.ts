/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore importing JSON file
import jobConfigFarequote from '../__mocks__/job_config_farequote';
import { isCombinedJobWithStats } from './combined_job';

describe('Types: Jobs', () => {
  test('Minimal integrity check.', () => {
    expect(isCombinedJobWithStats(jobConfigFarequote)).toBe(true);
  });
});
