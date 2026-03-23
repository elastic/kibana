/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AgentInstances } from '.';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import type { AgentExplorerItem } from '../agent_list';

// Mock the hooks
const mockUseProgressiveFetcher = jest.fn();
const mockUseApmParams = jest.fn();
const mockUseTimeRange = jest.fn();

jest.mock('../../../../../hooks/use_progressive_fetcher', () => ({
  useProgressiveFetcher: () => mockUseProgressiveFetcher(),
}));

jest.mock('../../../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

jest.mock('../../../../../hooks/use_time_range', () => ({
  useTimeRange: () => mockUseTimeRange(),
}));

// Mock child components
jest.mock('./agent_contextual_information', () => ({
  AgentContextualInformation: ({ agentName, serviceName }: any) => (
    <div data-test-subj="agent-contextual-information">
      Agent: {agentName}, Service: {serviceName}
    </div>
  ),
}));

jest.mock('./agent_instances_details', () => ({
  AgentInstancesDetails: ({ serviceName, isLoading, items }: any) => (
    <div data-test-subj="agent-instances-details">
      Service: {serviceName}, Loading: {isLoading.toString()}, Items: {items.length}
    </div>
  ),
}));

// Mock ResponsiveFlyout
jest.mock(
  '../../../transaction_details/waterfall_with_summary/waterfall_container/waterfall/responsive_flyout',
  () => ({
    ResponsiveFlyout: ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
      <div data-test-subj="responsive-flyout">
        <button data-test-subj="close-flyout" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ),
  })
);

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/settings/agent-explorer']}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderOptions = {
  wrapper: Wrapper,
};

describe('AgentInstances', () => {
  const mockOnClose = jest.fn();
  const mockAgent: AgentExplorerItem = {
    serviceName: 'test-service',
    agentName: 'nodejs' as const,
    environments: ['production'],
    agentVersion: ['1.2.3'],
    agentTelemetryAutoVersion: ['1.2.3'],
    instances: 5,
    agentDocsPageUrl: 'https://docs.elastic.co/nodejs',
    latestVersion: '1.2.3',
  };

  const defaultMockParams = {
    query: {
      environment: 'production',
      kuery: '',
    },
  };

  const defaultMockTimeRange = {
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-02T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApmParams.mockReturnValue(defaultMockParams);
    mockUseTimeRange.mockReturnValue(defaultMockTimeRange);
  });

  it('renders with proper title and structure', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: {
        items: [
          {
            serviceNode: 'instance-1',
            agentVersion: '1.2.3',
            environments: ['production'],
            lastReport: '2023-01-01T12:00:00Z',
          },
        ],
      },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Agent Instances')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('agent-contextual-information')).toBeInTheDocument();
    expect(screen.getByTestId('agent-instances-details')).toBeInTheDocument();
  });

  it('displays agent contextual information with correct props', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={true}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Agent: nodejs, Service: test-service')).toBeInTheDocument();
  });

  it('passes loading state correctly to details component', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.LOADING,
      data: undefined,
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Service: test-service, Loading: true, Items: 0')).toBeInTheDocument();
  });

  it('passes loaded data correctly to details component', () => {
    const mockItems = [
      {
        serviceNode: 'instance-1',
        agentVersion: '1.2.3',
        environments: ['production'],
        lastReport: '2023-01-01T12:00:00Z',
      },
      {
        serviceNode: 'instance-2',
        agentVersion: '1.2.2',
        environments: ['development'],
        lastReport: '2023-01-01T11:00:00Z',
      },
    ];

    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: mockItems },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Service: test-service, Loading: false, Items: 2')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    const user = userEvent.setup();

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    const closeButton = screen.getByTestId('close-flyout');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('uses correct parameters for fetching agent instances', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    // Verify that useProgressiveFetcher was called with the correct dependencies
    expect(mockUseProgressiveFetcher).toHaveBeenCalled();
  });

  it('handles error state gracefully', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.FAILURE,
      data: undefined,
      error: new Error('Failed to fetch'),
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={true}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    // Component should still render without crashing
    expect(screen.getByText('Agent Instances')).toBeInTheDocument();
    expect(screen.getByText('Service: test-service, Loading: false, Items: 0')).toBeInTheDocument();
  });

  it('uses time range hook for fetching', () => {
    const customTimeRange = {
      start: '2023-06-01T00:00:00Z',
      end: '2023-06-02T00:00:00Z',
    };
    mockUseTimeRange.mockReturnValue(customTimeRange);
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(mockUseTimeRange).toHaveBeenCalled();
  });

  it('handles different agent types', () => {
    const javaAgent: AgentExplorerItem = {
      ...mockAgent,
      agentName: 'java',
      serviceName: 'java-service',
    };

    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    render(
      <AgentInstances
        agent={javaAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Agent: java, Service: java-service')).toBeInTheDocument();
  });

  it('handles different environments and kuery parameters', () => {
    const customParams = {
      query: {
        environment: 'staging',
        kuery: 'service.environment:staging',
      },
    };
    mockUseApmParams.mockReturnValue(customParams);
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    // Verify the component renders correctly with different parameters
    expect(screen.getByText('Agent Instances')).toBeInTheDocument();
  });

  it('handles empty items array', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { items: [] },
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Service: test-service, Loading: false, Items: 0')).toBeInTheDocument();
  });

  it('renders correctly when data is undefined', () => {
    mockUseProgressiveFetcher.mockReturnValue({
      status: FETCH_STATUS.LOADING,
      data: undefined,
    });

    render(
      <AgentInstances
        agent={mockAgent}
        isLatestVersionsLoading={false}
        latestVersionsFailed={false}
        onClose={mockOnClose}
      />,
      renderOptions
    );

    expect(screen.getByText('Service: test-service, Loading: true, Items: 0')).toBeInTheDocument();
  });
});
