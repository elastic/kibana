/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useAddRuleDefaultException } from './use_add_rule_exception';

describe('useAddRuleDefaultException', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  it('should return default values', async () => {
    const { result, waitForValueToChange } = renderHook(() => useAddRuleDefaultException());
    const [loading, addRuleExceptionFunc] = result.current;
    expect(loading).toBeFalsy();
    expect(addRuleExceptionFunc).toBeNull();
    await waitForValueToChange(() => result.current);
    expect(result.current[1]).not.toBeNull();
  });
});
