/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertsPreview } from './alerts_preview';
import { TestProviders } from '../../../common/mock/test_providers';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { ParsedAlertsData } from '../../../overview/components/detection_response/alerts_by_status/types';

const mockAlertsData: ParsedAlertsData = {
  open: {
    total: 3,
    severities: [
      { key: 'low', value: 2, label: 'Low' },
      { key: 'medium', value: 1, label: 'Medium' },
    ],
  },
  acknowledged: {
    total: 2,
    severities: [
      { key: 'low', value: 1, label: 'Low' },
      { key: 'high', value: 1, label: 'High' },
    ],
  },
};

jest.mock(
  '../../../detections/components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data'
);
jest.mock('@kbn/expandable-flyout');

describe('AlertsPreview', () => {
  const mockOpenLeftPanel = jest.fn();

  beforeEach(() => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsPreview alertsData={mockAlertsData} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutInsightsAlertsTitleText')).toBeInTheDocument();
  });

  it('renders correct alerts number', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsPreview alertsData={mockAlertsData} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutInsightsAlertsCount').textContent).toEqual('5');
  });

  it('should render the correct number of distribution bar section based on the number of severities', () => {
    const { queryAllByTestId } = render(
      <TestProviders>
        <AlertsPreview alertsData={mockAlertsData} />
      </TestProviders>
    );

    expect(queryAllByTestId('AlertsPreviewDistributionBarTestId__part').length).toEqual(3);
  });
});
