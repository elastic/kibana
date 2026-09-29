/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useAnomalyChartPanelHighlight } from './use_anomaly_chart_panel_highlight';

vi.mock('@kbn/ml-anomaly-utils', () => {
      const mocked = {
      useSeverityColor: (score: number) => {
        if (score >= 75) return '#ff0000';
        if (score >= 50) return '#ff9900';
        return '#ffcc00';
      },
    };
      return { ...mocked, default: mocked };
    });

describe('useAnomalyChartPanelHighlight', () => {
  it('returns undefined when no anomaly score is provided', () => {
    const { result } = renderHook(() => useAnomalyChartPanelHighlight(undefined));

    expect(result.current).toBeUndefined();
  });

  it('returns border styles when an anomaly score is provided', () => {
    const { result } = renderHook(() => useAnomalyChartPanelHighlight(82));

    expect(result.current).not.toBeUndefined();
  });
});
