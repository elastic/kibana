/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { SuppressibleAlertRules } from '../../../../../common/detection_engine/constants';

import { useAlertSuppression } from './use_alert_suppression';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (featureFlagName: string) =>
    featureFlagName === 'alertSuppressionForIndicatorMatchRuleEnabled',
}));

describe('useAlertSuppression', () => {
  it('should return the correct isSuppressionEnabled value if rule Type exists in SuppressibleAlertRules and Feature Flag is enabled', () => {
    const rule: Partial<RuleResponse> = {
      type: SuppressibleAlertRules.THREAT_MATCH,
    };

    const { result } = renderHook(() => useAlertSuppression(rule));

    expect(result.current.isSuppressionEnabled).toBe(true);
  });

  it('should return the correct isSuppressionEnabled value if rule Type exists in SuppressibleAlertRules', () => {
    const rule: Partial<RuleResponse> = {
      type: SuppressibleAlertRules.QUERY,
    };

    const { result } = renderHook(() => useAlertSuppression(rule));

    expect(result.current.isSuppressionEnabled).toBe(true);
  });

  it('should return false if rule type is not set', () => {
    const rule: Partial<RuleResponse> = {};

    const { result } = renderHook(() => useAlertSuppression(rule));
    expect(result.current.isSuppressionEnabled).toBe(false);
  });

  it('should return false if rule type is not THREAT_MATCH', () => {
    const rule: Partial<RuleResponse> = {
      type: 'OTHER_RULE_TYPE' as Type,
    };
    const { result } = renderHook(() => useAlertSuppression(rule));

    expect(result.current.isSuppressionEnabled).toBe(false);
  });
});
