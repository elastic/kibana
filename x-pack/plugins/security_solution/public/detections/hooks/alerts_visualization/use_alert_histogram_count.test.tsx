/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../common/mock';
import { useAlertHistogramCount } from './use_alert_histogram_count';

jest.mock('../../../common/components/visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: jest.fn().mockReturnValue([{ hits: { total: 100 } }]),
}));

describe('useAlertHistogramCount', () => {
  const props = {
    totalAlertsObj: { value: 10, relation: '' },
    visualizationId: 'mockVisualizationId',
    isChartEmbeddablesEnabled: false,
  };
  it('returns total alerts count', () => {
    const { result } = renderHook(() => useAlertHistogramCount(props), { wrapper: TestProviders });
    expect(result.current).toEqual('Showing: 10 alerts');
  });

  it('returns visualization alerts count when isChartEmbeddablesEnabled is true', () => {
    const testPops = { ...props, isChartEmbeddablesEnabled: true };
    const { result } = renderHook(() => useAlertHistogramCount(testPops), {
      wrapper: TestProviders,
    });
    expect(result.current).toEqual('Showing: 100 alerts');
  });
});
