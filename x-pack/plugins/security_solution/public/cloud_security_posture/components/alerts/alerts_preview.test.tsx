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
import type { AlertSearchResponse } from '../../../detections/containers/detection_engine/alerts/types';

const mockAlertsData: AlertSearchResponse<unknown, unknown> = {
  took: 0,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 2,
      relation: 'eq',
    },
    max_score: 0,
    hits: [
      {
        fields: {
          'signal.rule.name': ['Low Alert'],
          'kibana.alert.reason': ['Low Alert Reason'],
          'kibana.alert.rule.uuid': ['Low Alert UUID'],
          'signal.rule.severity': ['low'],
        },
      },
      {
        fields: {
          'signal.rule.name': ['Medium Alert'],
          'kibana.alert.reason': ['Medium Alert Reason'],
          'kibana.alert.rule.uuid': ['Medium Alert UUID'],
          'signal.rule.severity': ['medium'],
        },
      },
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
        <AlertsPreview alertsData={mockAlertsData} alertsCount={1} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutInsightsAlertsTitleText')).toBeInTheDocument();
  });
});
