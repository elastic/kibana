/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AlertsByStatus } from '.';
import { parsedMockAlertsData } from './mock_data';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { mockCasesContract } from '../../../../../../cases/public/mocks';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useAlertsByStatus } from './use_alerts_by_status';

jest.mock('../../../../common/lib/kibana/kibana_react');
jest.mock('../../../../common/components/charts/draggable_legend', () => {
  return {
    DraggableLegend: jest.fn((props) => <div data-test-subj="legend" {...props} />),
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
    detailsButtonOptions: undefined,
    filterQuery: '',
    headerChildren: undefined,
    isInitialLoading: true,
    queryId: 'alertsByStatus',
    showInspectButton: true,
    signalIndexName: 'mock-signal-index',
    title: 'Alerts',
    visualizationActionsOptions: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: mockCases,
        application: {
          capabilities: { [CASES_FEATURE_ID]: { crud_cases: true, read_cases: true } },
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
    expect(container.querySelector(`[data-test-subj="alertsByStatusPanel"]`)).toBeInTheDocument();
  });

  test('render HeaderSection', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="header-section"]`)).toBeInTheDocument();
  });

  test('does Not render VisualizationActions if visualizationActionsOptions are not provided', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="stat-alertsByStatus"]`)
    ).not.toBeInTheDocument();
  });

  test('does Not render ViewDetailsButton if detailsButtonOptions are not provided', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="view-details-button"]`)
    ).not.toBeInTheDocument();
  });

  test('does Not render DonutChart if isInitialLoading is true', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="donut-chart"]`)).not.toBeInTheDocument();
  });

  test('render DonutChart if isInitialLoading is false', async () => {
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
    expect(container.querySelector(`[data-test-subj="donut-chart"]`)).toBeInTheDocument();
  });

  test('render Legend', () => {
    const testProps = {
      ...props,
      isInitialLoading: false,
    };
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
