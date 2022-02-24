/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getTailSamplingSettings,
  isTailBasedSamplingValid,
} from './tail_sampling_settings';

describe('tail_sampling_settings - isTailBasedSamplingFormValid', () => {
  it('return true when tail_sampling_interval is greater than 1s', () => {
    const settings = getTailSamplingSettings();
    const isValid = isTailBasedSamplingValid(
      {
        tail_sampling_enabled: { value: true, type: 'bool' },
        tail_sampling_interval: { value: '3s', type: 'text' },
        tail_sampling_policies: {
          value: 'testValue',
          type: 'yaml',
        },
      },
      settings
    );
    expect(isValid).toBe(true);
  });

  it('return false when tail_sampling_interval is less than 1s', () => {
    const settings = getTailSamplingSettings();
    const isValid = isTailBasedSamplingValid(
      {
        tail_sampling_enabled: { value: true, type: 'bool' },
        tail_sampling_interval: { value: '1ms', type: 'text' },
        tail_sampling_policies: {
          value: 'testValue',
          type: 'yaml',
        },
      },
      settings
    );
    expect(isValid).toBe(false);
  });

  it('returns true when tail_sampling_enabled is disabled', () => {
    const settings = getTailSamplingSettings();
    const isValid = isTailBasedSamplingValid(
      { tail_sampling_enabled: { value: false, type: 'bool' } },
      settings
    );
    expect(isValid).toBe(true);
  });
});
