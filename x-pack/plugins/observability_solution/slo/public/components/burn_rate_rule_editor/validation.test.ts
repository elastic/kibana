/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTION } from '../../../common/constants';
import { BurnRateRuleParams, WindowSchema } from '../../typings';
import { validateBurnRateRule } from './validation';

const createTestParams = (windowOverride: Partial<WindowSchema> = {}): BurnRateRuleParams => ({
  sloId: 'irrelevant',
  windows: [
    {
      id: '000-000-000',
      shortWindow: { value: 5, unit: 'm' },
      longWindow: { value: 1, unit: 'h' },
      maxBurnRateThreshold: 720,
      burnRateThreshold: 14.4,
      actionGroup: ALERT_ACTION.id,
      ...windowOverride,
    },
  ],
});

describe('ValidateBurnRateRule', () => {
  it('requires a selected slo', () => {
    const { errors } = validateBurnRateRule({ ...createTestParams(), sloId: undefined });
    expect(errors.sloId).toHaveLength(1);
  });

  it('requires a burn rate threshold', () => {
    const { errors } = validateBurnRateRule(
      createTestParams({ burnRateThreshold: undefined as unknown as number })
    );
    expect(errors.windows[0].burnRateThreshold).toHaveLength(1);
  });

  it('requires a max burn rate threshold', () => {
    const { errors } = validateBurnRateRule(
      createTestParams({ maxBurnRateThreshold: undefined as unknown as number })
    );
    expect(errors.windows[0].burnRateThreshold).toHaveLength(1);
  });

  it('validates burnRateThreshold is between 0.01 and maxBurnRateThreshold', () => {
    expect(
      validateBurnRateRule(
        createTestParams({
          burnRateThreshold: 10.1,
          maxBurnRateThreshold: 10,
        })
      ).errors.windows[0].burnRateThreshold
    ).toHaveLength(1);

    expect(
      validateBurnRateRule(createTestParams({ burnRateThreshold: 0.001 })).errors.windows[0]
        .burnRateThreshold
    ).toHaveLength(1);

    expect(
      validateBurnRateRule(
        createTestParams({
          burnRateThreshold: 10,
          maxBurnRateThreshold: 10,
        })
      ).errors.windows[0].burnRateThreshold
    ).toHaveLength(0);
  });

  it('validates longWindow is between 1 and 72 hours', () => {
    expect(
      validateBurnRateRule(
        createTestParams({
          longWindow: { value: 0, unit: 'h' },
        })
      ).errors.windows[0].longWindow.length
    ).toBe(1);

    expect(
      validateBurnRateRule(
        createTestParams({
          longWindow: { value: 73, unit: 'h' },
        })
      ).errors.windows[0].longWindow.length
    ).toBe(1);

    expect(
      validateBurnRateRule(
        createTestParams({
          longWindow: { value: 72, unit: 'h' },
        })
      ).errors.windows[0].longWindow.length
    ).toBe(0);

    expect(
      validateBurnRateRule(
        createTestParams({
          longWindow: { value: 1, unit: 'h' },
        })
      ).errors.windows[0].longWindow.length
    ).toBe(0);
  });

  it('validates shortWindow is less than longWindow', () => {
    expect(
      validateBurnRateRule(
        createTestParams({
          shortWindow: { value: 61, unit: 'm' },
          longWindow: { value: 1, unit: 'h' },
        })
      ).errors.windows[0].shortWindow.length
    ).toBe(1);

    expect(
      validateBurnRateRule(
        createTestParams({
          shortWindow: { value: 60, unit: 'm' },
          longWindow: { value: 1, unit: 'h' },
        })
      ).errors.windows[0].shortWindow.length
    ).toBe(0);

    expect(
      validateBurnRateRule(
        createTestParams({
          shortWindow: { value: 15, unit: 'm' },
          longWindow: { value: 1, unit: 'h' },
        })
      ).errors.windows[0].shortWindow.length
    ).toBe(0);
  });
});
