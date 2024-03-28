/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import * as useIsExperimentalFeatureEnabledMock from '../../../common/hooks/use_experimental_features';
import { useAlertSuppression } from './use_alert_suppression';

describe('useAlertSuppression', () => {
  beforeEach(() => {
    jest
      .spyOn(useIsExperimentalFeatureEnabledMock, 'useIsExperimentalFeatureEnabled')
      .mockReturnValueOnce(true);
  });

  it('should return the correct isSuppressionEnabled value for threat_match rule type', () => {
    const { result } = renderHook(() => useAlertSuppression('threat_match'));

    expect(result.current.isSuppressionEnabled).toBe(true);
  });

  describe('Eql Rule', () => {
    it('should return the correct isSuppressionEnabled value if rule Type exists in SUPPRESSIBLE_ALERT_RULES and Feature Flag is enabled', () => {
      const { result } = renderHook(() => useAlertSuppression('eql'));

      expect(result.current.isSuppressionEnabled).toBe(true);
    });

    it('should return the correct isSuppressionEnabled value if rule Type exists in SUPPRESSIBLE_ALERT_RULES and Feature Flag is disabled', () => {
      jest
        .spyOn(useIsExperimentalFeatureEnabledMock, 'useIsExperimentalFeatureEnabled')
        .mockReset()
        .mockReturnValueOnce(false);
      const { result } = renderHook(() => useAlertSuppression('eql'));

      expect(result.current.isSuppressionEnabled).toBe(false);
    });
  });

  it('should return the correct isSuppressionEnabled value if rule Type exists in SUPPRESSIBLE_ALERT_RULES', () => {
    const { result } = renderHook(() => useAlertSuppression('query'));

    expect(result.current.isSuppressionEnabled).toBe(true);
  });

  it('should return false if rule type is undefined', () => {
    const { result } = renderHook(() => useAlertSuppression(undefined));
    expect(result.current.isSuppressionEnabled).toBe(false);
  });

  it('should return false if rule type is not a suppressible rule', () => {
    const { result } = renderHook(() => useAlertSuppression('OTHER_RULE_TYPE' as Type));

    expect(result.current.isSuppressionEnabled).toBe(false);
  });
});
