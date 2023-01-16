/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AlertsByStatus } from './alerts_by_status';
import { parsedMockAlertsData } from './mock_data';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useAlertsByStatus } from './use_alerts_by_status';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('../../../../common/lib/kibana/kibana_react');
jest.mock('../../../../common/hooks/use_experimental_features', () => {
  return { useIsExperimentalFeatureEnabled: jest.fn() };
});

jest.mock('./alert_donut_embeddable');

jest.mock('./chart_label', () => {
  return {
    ChartLabel: jest.fn((props) => <span data-test-subj="chart-label" {...props} />),
  };
});
jest.mock('./use_alerts_by_status', () => ({
  useAlertsByStatus: jest.fn().mockReturnValue({
    items: [],
    isLoading: true,
  }),
}));

jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2022-04-08T12:00:00.000Z',
    to: '2022-04-09T12:00:00.000Z',
  }),
}));
describe('AlertsByStatus', () => {
  const mockCases = mockCasesContract();

  const props = {
    signalIndexName: 'mock-signal-index',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: mockCases,
        application: {
          capabilities: { [CASES_FEATURE_ID]: { crud_cases: true, read_cases: true } },
          getUrlForApp: jest.fn(),
        },
        theme: {},
      },
    });
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      items: [],
      isLoading: true,
    });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
  });

  test('render HoverVisibilityContainer', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="hoverVisibilityContainer"]`)
    ).toBeInTheDocument();
  });
  test('render HistogramPanel', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="detection-response-alerts-by-status-panel"]`)
    ).toBeInTheDocument();
  });

  test('shows correct names when no entity filter provided', () => {
    const { getByText, getByTestId } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );

    expect(getByText('Alerts')).toBeInTheDocument();
    expect(getByTestId('view-details-button')).toHaveTextContent('View alerts');
  });

  test('shows correct names when entity filter IS provided', () => {
    const { getByText, getByTestId } = render(
      <TestProviders>
        <AlertsByStatus {...props} entityFilter={{ field: 'name', value: 'val' }} />
      </TestProviders>
    );

    expect(getByText('Alerts by Severity')).toBeInTheDocument();
    expect(getByTestId('view-details-button')).toHaveTextContent('Investigate in Timeline');
  });

  test('render HeaderSection', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="header-section"]`)).toBeInTheDocument();
  });

  test('render Legend', () => {
    const testProps = {
      ...props,
      isInitialLoading: false,
    };
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      items: parsedMockAlertsData,
      isLoading: false,
    });

    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...testProps} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="legend"]`)).toBeInTheDocument();
  });

  test('render toggle query button', () => {
    const testProps = {
      ...props,
      isInitialLoading: false,
    };

    (useAlertsByStatus as jest.Mock).mockReturnValue({
      items: parsedMockAlertsData,
      isLoading: false,
    });

    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...testProps} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="query-toggle-header"]`)).toBeInTheDocument();
  });

  test('should render Lens embeddable when isChartEmbeddablesEnabled = true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    const testProps = {
      ...props,
    };

    (useAlertsByStatus as jest.Mock).mockReturnValue({
      items: null,
      isLoading: false,
    });

    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...testProps} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="alert-donut-embeddable"]`)
    ).toBeInTheDocument();
    expect((useAlertsByStatus as jest.Mock).mock.calls[0][0].skip).toBeTruthy();
  });
});
