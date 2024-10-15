/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AlertCountInsight } from './alert_count_insight';
import { useSummaryChartData } from '../../../../detections/components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock(
  '../../../../detections/components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data'
);

const fieldName = 'host.name';
const name = 'test host';
const testId = 'test';

const renderAlertCountInsight = () => {
  return render(
    <TestProviders>
      <AlertCountInsight name={name} fieldName={fieldName} data-test-subj={testId} />
    </TestProviders>
  );
};

describe('AlertCountInsight', () => {
  it('renders', () => {
    (useSummaryChartData as jest.Mock).mockReturnValue({
      isLoading: false,
      items: [
        { key: 'high', value: 78, label: 'High' },
        { key: 'low', value: 46, label: 'Low' },
        { key: 'medium', value: 32, label: 'Medium' },
        { key: 'critical', value: 21, label: 'Critical' },
      ],
    });
    const { getByTestId } = renderAlertCountInsight();
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });

  it('renders loading spinner if data is being fetched', () => {
    (useSummaryChartData as jest.Mock).mockReturnValue({ isLoading: true, items: [] });
    const { getByTestId } = renderAlertCountInsight();
    expect(getByTestId(`${testId}-loading-spinner`)).toBeInTheDocument();
  });

  it('renders null if no misconfiguration data found', () => {
    (useSummaryChartData as jest.Mock).mockReturnValue({ isLoading: false, items: [] });
    const { container } = renderAlertCountInsight();
    expect(container).toBeEmptyDOMElement();
  });
});
