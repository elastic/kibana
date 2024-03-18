/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { RiskSeverity } from '../../../../common/search_strategy';
import { useRiskDonutChartData } from './use_risk_donut_chart_data';
import type { SeverityCount } from '../severity/types';

describe('useRiskDonutChartData', () => {
  it('returns the total', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.low]: 1,
      [RiskSeverity.high]: 2,
      [RiskSeverity.moderate]: 3,
      [RiskSeverity.unknown]: 4,
      [RiskSeverity.critical]: 5,
    };

    const { result } = renderHook(() => useRiskDonutChartData(severityCount));

    const [_1, _2, total] = result.current;

    expect(total).toEqual(15);
  });

  it('returns all legends', () => {
    const severityCount: SeverityCount = {
      [RiskSeverity.low]: 1,
      [RiskSeverity.high]: 1,
      [RiskSeverity.moderate]: 1,
      [RiskSeverity.unknown]: 1,
      [RiskSeverity.critical]: 1,
    };

    const { result } = renderHook(() => useRiskDonutChartData(severityCount));

    const [_1, legends, _3] = result.current;

    expect(legends.map((l) => l.value)).toEqual(['Unknown', 'Low', 'Moderate', 'High', 'Critical']);
  });
});
