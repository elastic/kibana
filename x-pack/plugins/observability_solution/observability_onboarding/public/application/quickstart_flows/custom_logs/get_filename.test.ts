/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilename } from './get_filename';

describe('Observability onboarding - get_filename', () => {
  it.each([
    ['test', '/logs-onboarding/test.log'],
    ['test', '/logs-onboarding/test.log'],
    ['test', 'test.log'],
    ['test', '/logs-onboarding/long-path/test.log'],
    ['test', '/logs-onboarding/test.20240223.log'],
    ['test', 'test'],
    ['', ''],
    ['test', '\\logs-onboarding\\test.log'],
    ['test', "/logs-on'boarding/test.log"],
    ['te_st', "/logs-on'boarding/te'st.log"],
    ['test_123', '/logs-onboarding/test 123.log'],
    ['t_e_s_t_1_2_3_', '/logs-onboarding/t-e%s*t#1@2!3$.log'],
  ])('should return "%s" for filename "%s"', (expectedFilename: string, filePath: string) => {
    expect(getFilename(filePath)).toBe(expectedFilename);
  });
});
