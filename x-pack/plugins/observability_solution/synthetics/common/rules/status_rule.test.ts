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

  it('should return the correct condition type location based', () => {
    const { isChecksBased, isLocationBased } = getConditionType({
      window: {
        numberOfLocations: 5,
      },
    });
    expect(isChecksBased).toBe(false);
    expect(isLocationBased).toBe(true);
  });
});
