/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { RiskSeverity } from '../../../../common/search_strategy';
import { useRiskDonutChartData } from './use_risk_donut_chart_data';
import type { SeverityCount } from '../severity/types';

describe('useRiskDonutChartData', () => {
  it('returns the total', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Low]: 1,
      [RiskSeverity.High]: 2,
      [RiskSeverity.Moderate]: 3,
      [RiskSeverity.Unknown]: 4,
      [RiskSeverity.Critical]: 5,
    };

    const { result } = renderHook(() => useRiskDonutChartData(severityCount));

    const [_1, _2, total] = result.current;

    expect(total).toEqual(15);
  });

  it('returns all legends', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.Low]: 1,
      [RiskSeverity.High]: 1,
      [RiskSeverity.Moderate]: 1,
      [RiskSeverity.Unknown]: 1,
      [RiskSeverity.Critical]: 1,
    };

    const { result } = renderHook(() => useRiskDonutChartData(severityCount));

    const [_1, legends, _3] = result.current;

    expect(legends.map((l) => l.value)).toEqual(['Unknown', 'Low', 'Moderate', 'High', 'Critical']);
  });
});
