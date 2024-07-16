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
      .mockReturnValue(false);
  });

  (['new_terms', 'threat_match', 'saved_query', 'query', 'threshold', 'eql'] as Type[]).forEach(
    (ruleType) => {
      it(`should return the isSuppressionEnabled true for ${ruleType} rule type that exists in SUPPRESSIBLE_ALERT_RULES`, () => {
        const { result } = renderHook(() => useAlertSuppression(ruleType));

        expect(result.current.isSuppressionEnabled).toBe(true);
      });
    }
  );

  it('should return false if rule type is undefined', () => {
    const { result } = renderHook(() => useAlertSuppression(undefined));
    expect(result.current.isSuppressionEnabled).toBe(false);
  });

  it('should return false if rule type is not a suppressible rule', () => {
    const { result } = renderHook(() => useAlertSuppression('OTHER_RULE_TYPE' as Type));

    expect(result.current.isSuppressionEnabled).toBe(false);
  });

  describe('ML rules', () => {
    it('is true if the feature flag is enabled', () => {
      jest
        .spyOn(useIsExperimentalFeatureEnabledMock, 'useIsExperimentalFeatureEnabled')
        .mockReset()
        .mockReturnValue(true);
      const { result } = renderHook(() => useAlertSuppression('machine_learning'));

      expect(result.current.isSuppressionEnabled).toBe(true);
    });

    it('is false if the feature flag is disabled', () => {
      const { result } = renderHook(() => useAlertSuppression('machine_learning'));

      expect(result.current.isSuppressionEnabled).toBe(false);
    });
  });

  describe('ES|QL rules', () => {
    it('should return isSuppressionEnabled false if ES|QL Feature Flag is disabled', () => {
      const { result } = renderHook(() => useAlertSuppression('esql'));

      expect(result.current.isSuppressionEnabled).toBe(false);
    });

    it('should return isSuppressionEnabled true if ES|QL Feature Flag is enabled', () => {
      jest
        .spyOn(useIsExperimentalFeatureEnabledMock, 'useIsExperimentalFeatureEnabled')
        .mockImplementation((flag) => flag === 'alertSuppressionForEsqlRuleEnabled');
      const { result } = renderHook(() => useAlertSuppression('esql'));

      expect(result.current.isSuppressionEnabled).toBe(true);
    });
  });
});
