/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { ServiceOverviewInstancesTable } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import * as useApmParamsModule from '../../../../hooks/use_apm_params';
import * as useBreakpointsModule from '../../../../hooks/use_breakpoints';
import * as useInstanceDetailsFetcherModule from './use_instance_details_fetcher';
import type { InstancesSortField } from '../../../../../common/instances';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

jest.mock('../../../../hooks/use_apm_params');
jest.mock('../../../../hooks/use_breakpoints');
jest.mock('./use_instance_details_fetcher');

jest.mock('@kbn/logs-shared-plugin/common', () => {
  const originalModule = jest.requireActual('@kbn/logs-shared-plugin/common');
  return {
    ...originalModule,
    getLogsLocatorFromUrlService: jest
      .fn()
      .mockReturnValue({ getRedirectUrl: jest.fn(() => 'https://logs-redirect-url') }),
  };
});

const mockUseApmParams = useApmParamsModule.useApmParams as jest.Mock;
const mockUseBreakpoints = useBreakpointsModule.useBreakpoints as jest.Mock;
const mockUseInstanceDetailsFetcher =
  useInstanceDetailsFetcherModule.useInstanceDetailsFetcher as jest.Mock;

type ServiceInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

function Wrapper({ children }: { children?: React.ReactNode }) {
  return (
    <MemoryRouter
      initialEntries={['/services/test-service/overview?rangeFrom=2021-01-01&rangeTo=2021-01-02']}
    >
      <EuiThemeProvider>
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </EuiThemeProvider>
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
    mockUseInstanceDetailsFetcher.mockReturnValue({
      data: {
        service: { node: { name: 'test-instance' } },
        container: { id: 'container-id' },
        cloud: { provider: 'aws' },
      } as ServiceInstanceDetails,
      status: FETCH_STATUS.SUCCESS,
    });
  });

  it('renders table with correct structure and column headers', () => {
    render(<ServiceOverviewInstancesTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('serviceOverviewInstancesTable')).toBeInTheDocument();
    expect(screen.getByTestId('serviceInstancesTableContainer')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    expect(screen.getByText('Node name')).toBeInTheDocument();
    expect(screen.getByText('Latency (avg.)')).toBeInTheDocument();
    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText('Failed transaction rate')).toBeInTheDocument();
    expect(screen.getByText('CPU usage (avg.)')).toBeInTheDocument();
    expect(screen.getByText('Memory usage (avg.)')).toBeInTheDocument();
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
    expect(screen.queryByTestId('echChart')).not.toBeInTheDocument();
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

    // Verify that instance details are not visible initially
    expect(screen.queryByText('Service')).not.toBeInTheDocument();
    expect(screen.queryByText('Container')).not.toBeInTheDocument();
    expect(screen.queryByText('Cloud')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);

    // After clicking, the expand button aria-label should change to "Collapse"
    expect(expandButton).toHaveAttribute('aria-label', 'Collapse');

    // Verify that instance details are expanded and visible
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Container')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
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

    // Verify that instance details are not visible initially
    expect(screen.queryByText('Service')).not.toBeInTheDocument();
    expect(screen.queryByText('Container')).not.toBeInTheDocument();
    expect(screen.queryByText('Cloud')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-label', 'Collapse');

    // Verify that instance details are expanded and visible
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Container')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-label', 'Expand');

    // Verify that instance details are no longer visible
    expect(screen.queryByText('Service')).not.toBeInTheDocument();
    expect(screen.queryByText('Container')).not.toBeInTheDocument();
    expect(screen.queryByText('Cloud')).not.toBeInTheDocument();
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

    // Verify that menu content is not visible initially
    expect(screen.queryByText('Filter overview by instance')).not.toBeInTheDocument();
    expect(screen.queryByText('Metrics')).not.toBeInTheDocument();

    // Click to open actions menu
    fireEvent.click(actionsButton);

    // Verify the popover/menu is opened by checking for menu content
    // The InstanceActionsMenu always shows APM actions like "Filter overview by instance" and "Metrics"
    expect(screen.getByText('Filter overview by instance')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });
});
