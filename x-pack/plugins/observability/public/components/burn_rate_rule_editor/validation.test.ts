/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BurnRateRuleParams } from '../../typings';
import { validateBurnRateRule } from './validation';

const VALID_PARAMS: BurnRateRuleParams = {
  sloId: 'irrelevant',
  shortWindow: { value: 5, unit: 'm' },
  longWindow: { value: 1, unit: 'h' },
  maxBurnRateThreshold: 720,
  burnRateThreshold: 14.4,
};

describe('ValidateBurnRateRule', () => {
  it('requires a selected slo', () => {
    const { errors } = validateBurnRateRule({ ...VALID_PARAMS, sloId: undefined });
    expect(errors.sloId).toHaveLength(1);
  });

  it('requires a burn rate threshold', () => {
    const { errors } = validateBurnRateRule({ ...VALID_PARAMS, burnRateThreshold: undefined });
    expect(errors.burnRateThreshold).toHaveLength(1);
  });

  it('requires a max burn rate threshold', () => {
    const { errors } = validateBurnRateRule({ ...VALID_PARAMS, maxBurnRateThreshold: undefined });
    expect(errors.burnRateThreshold).toHaveLength(1);
  });

  it('validates burnRateThreshold is between 1 and maxBurnRateThreshold', () => {
    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        burnRateThreshold: 10.1,
        maxBurnRateThreshold: 10,
      }).errors.burnRateThreshold
    ).toHaveLength(1);

    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        burnRateThreshold: 0.99,
      }).errors.burnRateThreshold
    ).toHaveLength(1);

    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        burnRateThreshold: 10,
        maxBurnRateThreshold: 10,
      }).errors.burnRateThreshold
    ).toHaveLength(0);
  });

  it('validates longWindow is between 1 and 24hours', () => {
    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        longWindow: { value: 0, unit: 'h' },
      }).errors.longWindow.length
    ).toBe(1);

    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        longWindow: { value: 25, unit: 'h' },
      }).errors.longWindow.length
    ).toBe(1);

    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        longWindow: { value: 24, unit: 'h' },
      }).errors.longWindow.length
    ).toBe(0);

    expect(
      validateBurnRateRule({
        ...VALID_PARAMS,
        longWindow: { value: 1, unit: 'h' },
      }).errors.longWindow.length
    ).toBe(0);
  });
});
