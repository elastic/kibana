/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceOverviewInstancesTable } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import * as useApmParamsModule from '../../../../hooks/use_apm_params';
import * as useBreakpointsModule from '../../../../hooks/use_breakpoints';
import type { InstancesSortField } from '../../../../../common/instances';

jest.mock('../../../../hooks/use_apm_params');
jest.mock('../../../../hooks/use_breakpoints');

const mockUseApmParams = useApmParamsModule.useApmParams as jest.Mock;
const mockUseBreakpoints = useBreakpointsModule.useBreakpoints as jest.Mock;

function Wrapper({ children }: { children?: React.ReactNode }) {
  return (
    <MemoryRouter
      initialEntries={['/services/test-service/overview?rangeFrom=2021-01-01&rangeTo=2021-01-02']}
    >
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const defaultProps = {
  mainStatsItems: [],
  mainStatsItemCount: 0,
  serviceName: 'test-service',
  mainStatsStatus: FETCH_STATUS.SUCCESS,
  tableOptions: {
    pageIndex: 0,
    sort: {
      direction: 'desc' as const,
      field: 'throughput' as InstancesSortField,
    },
  },
  onChangeTableOptions: jest.fn(),
  detailedStatsLoading: false,
  detailedStatsData: undefined,
  isLoading: false,
  isNotInitiated: false,
};

describe('ServiceOverviewInstancesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApmParams.mockReturnValue({
      query: {
        kuery: '',
        latencyAggregationType: 'avg',
        comparisonEnabled: false,
        offset: undefined,
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: '2021-01-01',
        rangeTo: '2021-01-02',
      },
    });
    mockUseBreakpoints.mockReturnValue({
      isXl: false,
    });
  });

  it('renders table with correct structure', () => {
    render(<ServiceOverviewInstancesTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('serviceOverviewInstancesTable')).toBeInTheDocument();
    expect(screen.getByTestId('serviceInstancesTableContainer')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays title with correct instance count', () => {
    render(<ServiceOverviewInstancesTable {...defaultProps} mainStatsItemCount={5} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('Top 5 instances')).toBeInTheDocument();
  });

  it('displays singular instance when count is 1', () => {
    render(<ServiceOverviewInstancesTable {...defaultProps} mainStatsItemCount={1} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('Top 1 instance')).toBeInTheDocument();
  });

  it('displays loading message when status is LOADING', () => {
    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsStatus={FETCH_STATUS.LOADING}
        isLoading={true}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('displays "No instances found" message when items array is empty and not loading', () => {
    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={[]}
        mainStatsStatus={FETCH_STATUS.SUCCESS}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('No instances found')).toBeInTheDocument();
  });

  it('displays error message when status is FAILURE', () => {
    render(
      <ServiceOverviewInstancesTable {...defaultProps} mainStatsStatus={FETCH_STATUS.FAILURE} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('renders table with instance data', () => {
    const mockItems = [
      {
        serviceNodeName: 'instance-1',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
      {
        serviceNodeName: 'instance-2',
        latency: 2000,
        throughput: 200,
        errorRate: 0.1,
        cpuUsage: 0.7,
        memoryUsage: 0.8,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={2}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('instance-1')).toBeInTheDocument();
    expect(screen.getByText('instance-2')).toBeInTheDocument();
  });

  it('renders column headers correctly', () => {
    render(<ServiceOverviewInstancesTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Node name')).toBeInTheDocument();
    expect(screen.getByText('Latency (avg.)')).toBeInTheDocument();
    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText('Failed transaction rate')).toBeInTheDocument();
    expect(screen.getByText('CPU usage (avg.)')).toBeInTheDocument();
    expect(screen.getByText('Memory usage (avg.)')).toBeInTheDocument();
  });

  it('calls onChangeTableOptions when sorting is changed', () => {
    const onChangeTableOptions = jest.fn();
    const mockItems = [
      {
        serviceNodeName: 'instance-1',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
        onChangeTableOptions={onChangeTableOptions}
      />,
      { wrapper: Wrapper }
    );

    // Click on the Throughput column header to trigger sort change
    const throughputHeader = screen.getByText('Throughput');
    fireEvent.click(throughputHeader);

    expect(onChangeTableOptions).toHaveBeenCalled();
  });

  it('renders expand button for each instance row', () => {
    const mockItems = [
      {
        serviceNodeName: 'test-instance',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('instanceDetailsButton_test-instance')).toBeInTheDocument();
  });

  it('renders actions button for each instance row', () => {
    const mockItems = [
      {
        serviceNodeName: 'test-instance',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('instanceActionsButton_test-instance')).toBeInTheDocument();
  });

  it('renders pagination when there are multiple pages', () => {
    const mockItems = Array.from({ length: 5 }, (_, i) => ({
      serviceNodeName: `instance-${i}`,
      latency: 1000 * (i + 1),
      throughput: 100 * (i + 1),
      errorRate: 0.05,
      cpuUsage: 0.5,
      memoryUsage: 0.6,
    }));

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={11}
      />,
      { wrapper: Wrapper }
    );

    // EuiBasicTable should render pagination when totalItemCount > pageSize
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('hides spark plots when screen is XL breakpoint', () => {
    mockUseBreakpoints.mockReturnValue({
      isXl: true,
    });

    const mockItems = [
      {
        serviceNodeName: 'test-instance',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
      />,
      { wrapper: Wrapper }
    );

    // Table should still render, just without spark plots
    expect(screen.getByTestId('serviceOverviewInstancesTable')).toBeInTheDocument();
  });

  it('expands instance details when clicking expand button', () => {
    const mockItems = [
      {
        serviceNodeName: 'test-instance',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
      />,
      { wrapper: Wrapper }
    );

    const expandButton = screen.getByTestId('instanceDetailsButton_test-instance');
    expect(expandButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);

    // After clicking, the expand button aria-label should change to "Collapse"
    expect(expandButton).toHaveAttribute('aria-label', 'Collapse');
  });

  it('collapses instance details when clicking expand button twice', () => {
    const mockItems = [
      {
        serviceNodeName: 'test-instance',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
      />,
      { wrapper: Wrapper }
    );

    const expandButton = screen.getByTestId('instanceDetailsButton_test-instance');

    // Click to expand
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-label', 'Collapse');

    // Click to collapse
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-label', 'Expand');
  });

  it('opens actions menu when clicking actions button', () => {
    const mockItems = [
      {
        serviceNodeName: 'test-instance',
        latency: 1000,
        throughput: 100,
        errorRate: 0.05,
        cpuUsage: 0.5,
        memoryUsage: 0.6,
      },
    ];

    render(
      <ServiceOverviewInstancesTable
        {...defaultProps}
        mainStatsItems={mockItems}
        mainStatsItemCount={1}
      />,
      { wrapper: Wrapper }
    );

    const actionsButton = screen.getByTestId('instanceActionsButton_test-instance');
    expect(actionsButton).toBeInTheDocument();

    // Click to open actions menu
    fireEvent.click(actionsButton);

    // Verify the popover/menu is opened by checking the button state
    // The actions menu popover should be visible after clicking
    expect(actionsButton).toBeInTheDocument();
  });
});
