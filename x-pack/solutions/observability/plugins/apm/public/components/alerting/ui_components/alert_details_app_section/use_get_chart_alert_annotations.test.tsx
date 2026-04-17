/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetChartAlertAnnotations } from './use_get_chart_alert_annotations';
import { ALERT_END, ALERT_EVALUATION_THRESHOLD, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { TopAlert } from '@kbn/observability-plugin/public';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      colors: { danger: '#BD271E' },
    },
  }),
}));

const createMockAlert = (overrides: Partial<Record<string, unknown>> = {}): TopAlert =>
  ({
    start: 1630587249674,
    fields: {
      [ALERT_RULE_TYPE_ID]: 'apm.transaction_duration',
      [ALERT_EVALUATION_THRESHOLD]: 1500,
      ...overrides,
    },
  } as unknown as TopAlert);

const isLatencyRule = (id: string) => id === 'apm.transaction_duration';
const DATE_FORMAT = 'HH:mm:ss';

describe('useGetChartAlertAnnotations', () => {
  it('returns all annotations when the rule type matches', () => {
    const alert = createMockAlert();

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        dateFormat: DATE_FORMAT,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current).toHaveLength(4);
  });

  it('returns undefined when the rule type does not match and no custom threshold', () => {
    const alert = createMockAlert({
      [ALERT_RULE_TYPE_ID]: 'apm.transaction_error_rate',
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        dateFormat: DATE_FORMAT,
      })
    );

    expect(result.current).toBeUndefined();
  });

  it('returns annotations when rule type does not match but customAlertEvaluationThreshold is provided', () => {
    const alert = createMockAlert({
      [ALERT_RULE_TYPE_ID]: 'apm.transaction_error_rate',
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        customAlertEvaluationThreshold: 2000,
        dateFormat: DATE_FORMAT,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current).toHaveLength(4);
  });

  it('excludes threshold annotations when evaluation threshold is null', () => {
    const alert = createMockAlert({
      [ALERT_EVALUATION_THRESHOLD]: undefined,
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        dateFormat: DATE_FORMAT,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current).toHaveLength(2);
  });

  it('uses customAlertEvaluationThreshold over the alert field value', () => {
    const alert = createMockAlert({
      [ALERT_EVALUATION_THRESHOLD]: 1500,
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        customAlertEvaluationThreshold: 3000,
        dateFormat: DATE_FORMAT,
      })
    );

    expect(result.current).toBeDefined();
    const thresholdRect = result.current!.find((el) => el.key === 'alertThresholdRect');
    expect(thresholdRect?.props.threshold).toBe(3000);
  });

  it('computes alertEnd from ALERT_END field when present', () => {
    const alertEndDate = '2021-09-02T13:00:00.000Z';
    const alert = createMockAlert({
      [ALERT_END]: alertEndDate,
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        dateFormat: DATE_FORMAT,
      })
    );

    const activeRange = result.current!.find((el) => el.key === 'alertActiveRect');
    expect(activeRange?.props.alertEnd).toBe(new Date(alertEndDate).valueOf());
  });

  it('sets alertEnd to undefined when ALERT_END field is absent', () => {
    const alert = createMockAlert();

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        dateFormat: DATE_FORMAT,
      })
    );

    const activeRange = result.current!.find((el) => el.key === 'alertActiveRect');
    expect(activeRange?.props.alertEnd).toBeUndefined();
  });

  it('applies normalizeThreshold to the threshold value', () => {
    const alert = createMockAlert({
      [ALERT_EVALUATION_THRESHOLD]: 50,
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        dateFormat: DATE_FORMAT,
        normalizeThreshold: (value) => value / 100,
      })
    );

    expect(result.current).toBeDefined();
    const thresholdRect = result.current!.find((el) => el.key === 'alertThresholdRect');
    expect(thresholdRect?.props.threshold).toBe(0.5);
    const thresholdAnnotation = result.current!.find((el) => el.key === 'alertThresholdAnnotation');
    expect(thresholdAnnotation?.props.threshold).toBe(0.5);
  });

  it('returns annotations when customAlertEvaluationThreshold is 0', () => {
    const alert = createMockAlert({
      [ALERT_RULE_TYPE_ID]: 'apm.transaction_error_rate',
    });

    const { result } = renderHook(() =>
      useGetChartAlertAnnotations({
        alert,
        isMatchingRuleType: isLatencyRule,
        customAlertEvaluationThreshold: 0,
        dateFormat: DATE_FORMAT,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current).toHaveLength(4);
  });
});
