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
import { mockCasesContract } from '../../../../../../cases/public/mocks';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useAlertsByStatus } from './use_alerts_by_status';

jest.mock('../../../../common/lib/kibana/kibana_react');

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
describe('AlertsByStatus', () => {
  const mockCases = mockCasesContract();

  const props = {
    showInspectButton: true,
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
});
