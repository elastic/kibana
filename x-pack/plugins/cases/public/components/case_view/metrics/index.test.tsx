/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import {
  basicCaseMetrics,
  basicCaseNumericValueFeatures,
  basicCaseStatusFeatures,
} from '../../../containers/mock';
import { CaseViewMetrics } from '.';
import type { SingleCaseMetrics, SingleCaseMetricsFeature } from '../../../../common/ui';
import { TestProviders } from '../../../common/mock';
import { useGetCaseMetrics } from '../../../containers/use_get_case_metrics';
import { useCasesFeatures } from '../../../common/use_cases_features';

jest.mock('../../../containers/use_get_case_metrics');
jest.mock('../../../common/use_cases_features');

const useFetchCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;

const renderCaseMetrics = ({
  metrics = basicCaseMetrics,
  features = [...basicCaseNumericValueFeatures, ...basicCaseStatusFeatures],
  isLoading = false,
}: {
  metrics?: SingleCaseMetrics;
  features?: SingleCaseMetricsFeature[];
  isLoading?: boolean;
} = {}) => {
  useFetchCaseMetricsMock.mockImplementation(() => ({
    data: { metrics },
    isLoading,
  }));

  useCasesFeaturesMock.mockReturnValue({ metricsFeatures: features });
  return render(
    <TestProviders>
      <CaseViewMetrics caseId={'1234'} />
    </TestProviders>
  );
};

interface FeatureTest {
  feature: SingleCaseMetricsFeature;
  items: Array<{
    title: string;
    value: string | number;
  }>;
}

const metricsFeaturesTests: FeatureTest[] = [
  {
    feature: 'alerts.count',
    items: [{ title: 'Total alerts', value: basicCaseMetrics.alerts!.count! }],
  },
  {
    feature: 'alerts.users',
    items: [{ title: 'Associated users', value: basicCaseMetrics.alerts!.users!.total! }],
  },
  {
    feature: 'alerts.hosts',
    items: [{ title: 'Associated hosts', value: basicCaseMetrics.alerts!.hosts!.total! }],
  },
  {
    feature: 'actions.isolateHost',
    items: [
      {
        title: 'Isolated hosts',
        value:
          basicCaseMetrics.actions!.isolateHost!.isolate.total -
          basicCaseMetrics.actions!.isolateHost!.unisolate.total,
      },
    ],
  },
  {
    feature: 'connectors',
    items: [{ title: 'Total connectors', value: basicCaseMetrics.connectors!.total! }],
  },
  {
    feature: 'lifespan',
    items: [
      {
        title: 'Case created',
        value: '2020-02-19T23:06:33Z',
      },
      {
        title: 'In progress duration',
        value: '20 milliseconds',
      },
      {
        title: 'Open duration',
        value: '10 milliseconds',
      },
      {
        title: 'Duration from creation to close',
        value: '1 day',
      },
    ],
  },
];

describe('CaseViewMetrics', () => {
  beforeEach(() => {});
  it('should render', () => {
    const { getByTestId } = renderCaseMetrics();
    expect(getByTestId('case-view-metrics-panel')).toBeInTheDocument();
  });

  it('should render loading spinner', () => {
    const { getByTestId } = renderCaseMetrics({ isLoading: true });
    expect(getByTestId('case-view-metrics-spinner')).toBeInTheDocument();
  });

  it('should render metrics with default value 0', async () => {
    const { getAllByText } = renderCaseMetrics({
      metrics: {},
      features: basicCaseNumericValueFeatures,
    });
    await waitFor(() => {
      expect(getAllByText('0')).toHaveLength(basicCaseNumericValueFeatures.length);
    });
  });

  it('should render status metrics with default value of a dash', () => {
    const { getAllByText } = renderCaseMetrics({ metrics: {} });
    // \u2014 is the unicode for a long dash
    expect(getAllByText('\u2014')).toHaveLength(3);
  });

  it('should not render if no features are returned', () => {
    const result = renderCaseMetrics({ features: [] });
    expect(result.container.innerHTML).toEqual('');
  });

  it('should render open to close duration with the icon when it is reopened', () => {
    const { getByText, getByTestId } = renderCaseMetrics({
      metrics: {
        lifespan: {
          creationDate: new Date(0).toISOString(),
          closeDate: new Date(2).toISOString(),
          statusInfo: {
            inProgressDuration: 20,
            openDuration: 10,
            reopenDates: [new Date(1).toISOString()],
          },
        },
      },
    });

    expect(getByText('2 milliseconds (reopened)')).toBeInTheDocument();
    expect(getByTestId('case-metrics-lifespan-reopen-icon')).toBeInTheDocument();
  });

  it('should not render open to close duration with the icon when it is not reopened', () => {
    const { getByText, queryByTestId } = renderCaseMetrics({
      metrics: {
        lifespan: {
          creationDate: new Date(0).toISOString(),
          closeDate: new Date(2).toISOString(),
          statusInfo: {
            inProgressDuration: 20,
            openDuration: 10,
            reopenDates: [],
          },
        },
      },
    });

    expect(getByText('2 milliseconds')).toBeInTheDocument();
    expect(queryByTestId('case-metrics-lifespan-reopen-icon')).not.toBeInTheDocument();
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
    expect(getByText('Isolated hosts')).toBeInTheDocument();
    expect(getByText('0')).toBeInTheDocument();
  });

  describe.each(metricsFeaturesTests)('Metrics feature tests', ({ feature, items }) => {
    it(`should not render other metrics when rendering feature: ${feature}`, () => {
      const { queryByText } = renderCaseMetrics({ features: [feature] });
      metricsFeaturesTests.forEach(({ feature: otherFeature, items: otherItems }) => {
        if (feature !== otherFeature) {
          otherItems.forEach(({ title }) => {
            expect(queryByText(title)).toBeNull();
          });
        }
      });
    });

    describe.each(items)(`Metric feature: ${feature} item: %s`, ({ title, value }) => {
      it('should render metric', () => {
        const { getByText } = renderCaseMetrics({ features: [feature] });
        expect(getByText(title)).toBeInTheDocument();
        expect(getByText(value)).toBeInTheDocument();
      });
    });
  });
});
