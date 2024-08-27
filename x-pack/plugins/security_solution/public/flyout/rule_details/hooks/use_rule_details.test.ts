/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, type RenderHookResult } from '@testing-library/react';
import type { UseRuleDetailsParams, UseRuleDetailsResult } from './use_rule_details';
import { useRuleDetails } from './use_rule_details';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

const mockUseRuleWithFallback = useRuleWithFallback as jest.Mock;
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const initialProps: UseRuleDetailsParams = {
  ruleId: 'ruleId',
};

describe('useRuleDetails', () => {
  let hookResult: RenderHookResult<UseRuleDetailsResult, UseRuleDetailsParams>;

  it('should return loading as true when the rule is loading', () => {
    mockUseRuleWithFallback.mockReturnValue({
      rule: null,
      loading: true,
      isExistingRule: false,
    });
    hookResult = renderHook((props: UseRuleDetailsParams) => useRuleDetails(props), {
      initialProps,
    });
    expect(hookResult.result.current.loading).toBe(true);
    expect(hookResult.result.current.isExistingRule).toBe(false);
    expect(hookResult.result.current.rule).toBe(null);
  });

  it('should return empty rule when no rule is found', () => {
    mockUseRuleWithFallback.mockReturnValue({
      rule: null,
      loading: false,
      isExistingRule: false,
    });
    hookResult = renderHook((props: UseRuleDetailsParams) => useRuleDetails(props), {
      initialProps,
    });
    expect(hookResult.result.current.loading).toBe(false);
    expect(hookResult.result.current.isExistingRule).toBe(false);
    expect(hookResult.result.current.rule).toBe(null);
  });

  it('should return rule data when rule is loaded', () => {
    mockUseRuleWithFallback.mockReturnValue({
      rule: { id: 'ruleId' },
      loading: false,
      isExistingRule: true,
    });

    hookResult = renderHook((props: UseRuleDetailsParams) => useRuleDetails(props), {
      initialProps,
    });
    expect(hookResult.result.current.loading).toBe(false);
    expect(hookResult.result.current.isExistingRule).toBe(true);
    expect(hookResult.result.current.rule).toEqual({ id: 'ruleId' });
  });
});
