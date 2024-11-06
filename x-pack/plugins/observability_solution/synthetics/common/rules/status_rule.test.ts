/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConditionType } from './status_rule';

describe('Status Rule', () => {
  it('should return the correct condition type for empty', () => {
    const { useLatestChecks } = getConditionType({} as any);
    expect(useLatestChecks).toBe(true);
  });

  it('should return the correct condition type check based', () => {
    const { useLatestChecks, useTimeWindow } = getConditionType({
      window: {
        numberOfChecks: 5,
      },
    });
    expect(useLatestChecks).toBe(true);
    expect(useTimeWindow).toBe(false);
  });

  it('should return the correct condition type time based', () => {
    const { useTimeWindow, useLatestChecks } = getConditionType({
      window: {
        time: {
          unit: 'm',
          size: 5,
        },
      },
    });
    expect(useTimeWindow).toBe(true);
    expect(useLatestChecks).toBe(false);
  });
});
