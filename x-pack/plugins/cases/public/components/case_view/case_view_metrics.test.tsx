/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { basicCaseMetrics } from '../../containers/mock';
import { CaseViewMetrics } from './case_view_metrics';
import { CaseMetrics } from '../../../common';
import { TestProviders } from '../../common/mock';

const renderCaseMetrics = ({
  metrics = basicCaseMetrics,
  isLoading = false,
}: {
  metrics?: CaseMetrics;
  isLoading?: boolean;
} = {}) => {
  return render(
    <TestProviders>
      <CaseViewMetrics metrics={metrics} isLoading={isLoading} />
    </TestProviders>
  );
};

describe('CaseViewMetrics', () => {
  it('should render', () => {
    const { getByTestId } = renderCaseMetrics();
    expect(getByTestId('case-view-metrics-panel')).toBeInTheDocument();
  });

  it('should render loading spinner', () => {
    const { getByTestId } = renderCaseMetrics({ isLoading: true });
    expect(getByTestId('case-view-metrics-spinner')).toBeInTheDocument();
  });

  it('should render metrics', () => {
    const { getByText } = renderCaseMetrics();
    expect(getByText('Total Alerts')).toBeInTheDocument();
    expect(getByText('Associated Users')).toBeInTheDocument();
    expect(getByText('Associated Hosts')).toBeInTheDocument();
    expect(getByText('Total Connectors')).toBeInTheDocument();
  });

  it('should render total alerts metrics only', () => {
    const alertsCount = basicCaseMetrics.alertsCount! + 4321;
    const metrics = { alertsCount };
    const { getByText } = renderCaseMetrics({ metrics });
    expect(getByText('Total Alerts')).toBeInTheDocument();
    expect(getByText(alertsCount)).toBeInTheDocument();
  });

  it('should render associated users metrics only', () => {
    const totalAlertUsers = basicCaseMetrics.alertUsers!.total + 4321;
    const metrics = {
      alertUsers: { ...basicCaseMetrics.alertUsers!, total: totalAlertUsers },
    };
    const { getByText } = renderCaseMetrics({ metrics });
    expect(getByText('Associated Users')).toBeInTheDocument();
    expect(getByText(totalAlertUsers)).toBeInTheDocument();
  });

  it('should render associated hosts metrics only', () => {
    const totalAlertHosts = basicCaseMetrics.alertHosts!.total + 4321;
    const metrics = {
      alertHosts: { ...basicCaseMetrics.alertHosts!, total: totalAlertHosts },
    };
    const { getByText } = renderCaseMetrics({ metrics });
    expect(getByText('Associated Hosts')).toBeInTheDocument();
    expect(getByText(totalAlertHosts)).toBeInTheDocument();
  });

  it('should render total Connectors metrics only', () => {
    const connectors = [...basicCaseMetrics.connectors!, { id: 'foo', name: 'bar', pushCount: 0 }];
    const metrics = {
      connectors,
    };
    const { getByText } = renderCaseMetrics({ metrics });
    expect(getByText('Total Connectors')).toBeInTheDocument();
    expect(getByText(connectors.length)).toBeInTheDocument();
  });
});
