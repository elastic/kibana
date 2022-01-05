/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { basicCaseMetrics, basicCaseMetricsFeatures } from '../../containers/mock';
import { CaseViewMetrics } from './case_view_metrics';
import { CaseMetrics, CaseMetricsFeature } from '../../../common/ui';
import { TestProviders } from '../../common/mock';

const renderCaseMetrics = ({
  metrics = basicCaseMetrics,
  features = basicCaseMetricsFeatures,
  isLoading = false,
}: {
  metrics?: CaseMetrics;
  features?: CaseMetricsFeature[];
  isLoading?: boolean;
} = {}) => {
  return render(
    <TestProviders>
      <CaseViewMetrics metrics={metrics} isLoading={isLoading} features={features} />
    </TestProviders>
  );
};

const metricsFeaturesTests: Array<[CaseMetricsFeature, string, number]> = [
  ['alerts.count', 'Total Alerts', basicCaseMetrics.alerts!.count!],
  ['alerts.users', 'Associated Users', basicCaseMetrics.alerts!.users!.total!],
  ['alerts.hosts', 'Associated Hosts', basicCaseMetrics.alerts!.hosts!.total!],
  [
    'actions.isolateHost',
    'Isolated Hosts',
    basicCaseMetrics.actions!.isolateHost!.isolate.total -
      basicCaseMetrics.actions!.isolateHost!.unisolate.total,
  ],
  ['connectors', 'Total Connectors', basicCaseMetrics.connectors!.total!],
];

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
    expect(getByText('Isolated Hosts')).toBeInTheDocument();
    expect(getByText('Total Connectors')).toBeInTheDocument();
  });

  it('should render metrics with default value 0', () => {
    const { getByText, getAllByText } = renderCaseMetrics({ metrics: {} });
    expect(getByText('Total Alerts')).toBeInTheDocument();
    expect(getByText('Associated Users')).toBeInTheDocument();
    expect(getByText('Associated Hosts')).toBeInTheDocument();
    expect(getByText('Isolated Hosts')).toBeInTheDocument();
    expect(getByText('Total Connectors')).toBeInTheDocument();
    expect(getAllByText('0')).toHaveLength(basicCaseMetricsFeatures.length);
  });

  it('should prevent negative value for isolateHost actions', () => {
    const incosistentMetrics = {
      actions: {
        isolateHost: {
          isolate: { total: 1 },
          unisolate: { total: 2 },
        },
      },
    };
    const { getByText } = renderCaseMetrics({
      metrics: incosistentMetrics,
      features: ['actions.isolateHost'],
    });
    expect(getByText('Isolated Hosts')).toBeInTheDocument();
    expect(getByText('0')).toBeInTheDocument();
  });

  describe.each(metricsFeaturesTests)('Metrics feature: %s ', (feature, text, total) => {
    it('should render metric', () => {
      const { getByText } = renderCaseMetrics({ features: [feature] });
      expect(getByText(text)).toBeInTheDocument();
      expect(getByText(total)).toBeInTheDocument();
    });

    it('should not render other metrics', () => {
      const { queryByText } = renderCaseMetrics({ features: [feature] });
      metricsFeaturesTests.forEach(([_, otherMetricText]) => {
        if (otherMetricText !== text) {
          expect(queryByText(otherMetricText)).toBeNull();
        }
      });
    });
  });
});
