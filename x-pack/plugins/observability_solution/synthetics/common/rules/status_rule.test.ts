/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConditionType } from './status_rule';

describe('Status Rule', () => {
  it('should return the correct condition type for empty', () => {
    const { isChecksBased } = getConditionType({} as any);
    expect(isChecksBased).toBe(true);
  });

  it('should return the correct condition type check based', () => {
    const { isChecksBased, isTimeWindow } = getConditionType({
      window: {
        numberOfLocations: 5,
        numberOfChecks: 5,
      },
    });
    expect(isChecksBased).toBe(true);
    expect(isTimeWindow).toBe(false);
  });

  it('should return the correct condition type time based', () => {
    const { isTimeWindow, isChecksBased } = getConditionType({
      window: {
        numberOfLocations: 5,
        time: {
          unit: 'm',
          size: 5,
        },
      },
    });
    expect(isTimeWindow).toBe(true);
    expect(isChecksBased).toBe(false);
  });
});
