/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { retentionPolicyMaxAgeValidator } from './retention_policy_max_age_validator';

describe('Transform: retentionPolicyMaxAgeValidator()', () => {
  const transformRetentionPolicyMaxAgeValidator = (arg: string) =>
    retentionPolicyMaxAgeValidator(arg).length === 0;

  it('should only allow values equal or above 60s.', () => {
    expect(transformRetentionPolicyMaxAgeValidator('0nanos')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59999999999nanos')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60000000000nanos')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('60000000001nanos')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0micros')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59999999micros')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60000000micros')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('60000001micros')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0ms')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59999ms')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60000ms')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('60001ms')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0s')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('1s')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('59s')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('60s')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('61s')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('10000s')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0m')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('1m')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('100m')).toBe(true);

    expect(transformRetentionPolicyMaxAgeValidator('0h')).toBe(false);
    expect(transformRetentionPolicyMaxAgeValidator('1h')).toBe(true);
    expect(transformRetentionPolicyMaxAgeValidator('2h')).toBe(true);
  });
});
