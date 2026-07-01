/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ServiceNodeData } from '../../../../../common/service_map';
import { ServiceFlyoutOverview } from '.';

const mockUseServiceHasSystemMetrics = jest.fn<boolean | undefined, []>();

jest.mock('../hooks/use_service_has_system_metrics', () => ({
  useServiceHasSystemMetrics: () => mockUseServiceHasSystemMetrics(),
}));

jest.mock('../../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({ dataView: undefined }),
}));

jest.mock('./query_controls', () => ({
  ServiceFlyoutQueryControls: () => <div data-test-subj="queryControlsMock" />,
}));

jest.mock('./lens_chart', () => ({
  ServiceFlyoutLensChart: () => <div data-test-subj="lensChartMock" />,
}));

const service: ServiceNodeData = {
  id: 'opbeans-java',
  label: 'opbeans-java',
  isService: true,
  agentName: 'java',
};

const defaultProps = {
  service,
  environment: 'production' as const,
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  transactionType: 'request',
  refreshToken: 0,
  onEnvironmentChange: jest.fn(),
  onRangeChange: jest.fn(),
  onRefresh: jest.fn(),
  onTransactionTypeChange: jest.fn(),
};

function renderOverview(overrides: Partial<typeof defaultProps> = {}) {
  return render(
    <IntlProvider locale="en">
      <ServiceFlyoutOverview {...defaultProps} {...overrides} />
    </IntlProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServiceFlyoutOverview infrastructure section visibility', () => {
  it('hides the infrastructure section while system metrics data is loading', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue(undefined);

    renderOverview();

    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics')
    ).not.toBeInTheDocument();
  });

  it('hides the infrastructure section when the service has no system metrics', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue(false);

    renderOverview();

    expect(
      screen.queryByTestId('serviceFlyoutSection-infrastructureMetrics')
    ).not.toBeInTheDocument();
  });

  it('shows the infrastructure section when the service has system metrics', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue(true);

    renderOverview();

    expect(screen.getByTestId('serviceFlyoutSection-infrastructureMetrics')).toBeInTheDocument();
  });

  it('always renders the key metrics section regardless of system metrics', () => {
    mockUseServiceHasSystemMetrics.mockReturnValue(false);

    renderOverview();

    expect(screen.getByTestId('serviceFlyoutSection-keyMetrics')).toBeInTheDocument();
  });
});
