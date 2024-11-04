/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useSummaryChartData } from '../../../detections/components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';
import { AlertsPreview } from './alerts_preview';
import { TestProviders } from '../../../common/mock/test_providers';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

jest.mock(
  '../../../detections/components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data'
);
jest.mock('@kbn/expandable-flyout');

describe('AlertsPreview', () => {
  (useSummaryChartData as jest.Mock).mockReturnValue({
    items: [{ key: 'low', value: 1, label: 'Low' }],
  });

  const mockOpenLeftPanel = jest.fn();

  beforeEach(() => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
    (useSummaryChartData as jest.Mock).mockReturnValue({
      items: [{ key: 'low', value: 1, label: 'Low' }],
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsPreview name="host1" fieldName="host.name" />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutInsightsAlertsTitleText')).toBeInTheDocument();
  });
});
