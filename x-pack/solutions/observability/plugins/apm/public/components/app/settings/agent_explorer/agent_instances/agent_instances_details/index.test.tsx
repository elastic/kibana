/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AgentInstancesDetails, getInstanceColumns } from '.';
import { MockApmPluginContextWrapper } from '../../../../../../context/apm_plugin/mock_apm_plugin_context';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../../../common/service_nodes';
import type { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';

// Interface for agent instance used in tests
interface MockAgentInstance {
  serviceNode: string | null;
  environments: string[];
  agentVersion: string;
  lastReport: string;
}

// Type for columns with render functions
type ColumnWithRender = EuiTableFieldDataColumnType<MockAgentInstance>;

// Mock the hooks and components
const mockUseAnyOfApmParams = jest.fn();
const mockGetComparisonEnabled = jest.fn();

jest.mock('../../../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => mockUseAnyOfApmParams(),
}));

jest.mock('../../../../../shared/time_comparison/get_comparison_enabled', () => ({
  getComparisonEnabled: () => mockGetComparisonEnabled(),
}));

// Mock child components
jest.mock('../../../../../shared/environment_badge', () => ({
  EnvironmentBadge: ({ environments }: { environments: string[] }) => (
    <div data-test-subj="environment-badge">{environments.join(', ')}</div>
  ),
}));

jest.mock('../../../../../shared/item_badge', () => ({
  ItemsBadge: ({ items }: { items: string[] }) => (
    <div data-test-subj="items-badge">{items.join(', ')}</div>
  ),
}));

jest.mock('../../../../../shared/popover_tooltip', () => ({
  PopoverTooltip: ({ children }: { children: ReactNode }) => (
    <div data-test-subj="popover-tooltip">{children}</div>
  ),
}));

jest.mock('../../../../../shared/truncate_with_tooltip', () => ({
  TruncateWithTooltip: ({ text, content, 'data-test-subj': testSubj }: any) => (
    <div data-test-subj={testSubj}>{content || text}</div>
  ),
}));

jest.mock('../../../../../shared/links/apm/metric_overview_link', () => ({
  MetricOverviewLink: ({ children, serviceName, query }: any) => (
    <a
      data-test-subj="metric-overview-link"
      href={`/services/${serviceName}/metrics?${new URLSearchParams(query)}`}
    >
      {children}
    </a>
  ),
}));

jest.mock('@kbn/apm-ui-shared', () => ({
  Timestamp: ({ timestamp }: { timestamp: number }) => (
    <span data-test-subj="timestamp">{new Date(timestamp).toISOString()}</span>
  ),
}));

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

describe('AgentInstancesDetails', () => {
  const defaultProps = {
    serviceName: 'test-service',
    agentName: 'nodejs' as AgentName,
    environment: 'production',
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-02T00:00:00Z',
    agentDocsPageUrl: 'https://docs.elastic.co/nodejs',
    isLoading: false,
    items: [],
  };

  const mockParams = {
    query: {
      environment: 'production',
      kuery: '',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnyOfApmParams.mockReturnValue(mockParams);
    mockGetComparisonEnabled.mockReturnValue(false);
  });

  it('renders table with correct structure', () => {
    render(<AgentInstancesDetails {...defaultProps} />, renderOptions);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays loading message when isLoading is true', () => {
    render(<AgentInstancesDetails {...defaultProps} isLoading={true} />, renderOptions);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays no data message when items array is empty and not loading', () => {
    render(<AgentInstancesDetails {...defaultProps} items={[]} />, renderOptions);

    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders table with agent instance data', () => {
    const mockItems = [
      {
        serviceNode: 'instance-1',
        environments: ['production'],
        agentVersion: '1.2.3',
        lastReport: '2023-01-01T12:00:00.000Z',
      },
      {
        serviceNode: 'instance-2',
        environments: ['staging', 'development'],
        agentVersion: '1.2.2',
        lastReport: '2023-01-01T11:00:00.000Z',
      },
    ];

    render(<AgentInstancesDetails {...defaultProps} items={mockItems} />, renderOptions);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('staging, development')).toBeInTheDocument();
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
    expect(screen.getByText('1.2.2')).toBeInTheDocument();
  });

  describe('getInstanceColumns', () => {
    const mockQuery = {
      serviceGroup: '',
      environment: 'production',
      rangeFrom: '2023-01-01T00:00:00Z',
      rangeTo: '2023-01-02T00:00:00Z',
      comparisonEnabled: false,
    };

    const defaultColumnProps = {
      serviceName: 'test-service',
      agentName: 'nodejs' as AgentName,
      query: mockQuery,
      agentDocsPageUrl: 'https://docs.elastic.co/nodejs',
    };

    it('returns correct column configuration', () => {
      const columns = getInstanceColumns(defaultColumnProps);

      expect(columns).toHaveLength(4);
      expect((columns[0] as ColumnWithRender).field).toBe('serviceNode');
      expect(columns[0].name).toBe('Instance');
      expect((columns[0] as ColumnWithRender).sortable).toBe(true);

      expect((columns[1] as ColumnWithRender).field).toBe('environments');
      expect(columns[1].name).toBe('Environment');
      expect((columns[1] as ColumnWithRender).sortable).toBe(true);

      expect((columns[2] as ColumnWithRender).field).toBe('agentVersion');
      expect(columns[2].name).toBe('Agent Version');
      expect((columns[2] as ColumnWithRender).sortable).toBe(true);

      expect((columns[3] as ColumnWithRender).field).toBe('lastReport');
      expect(columns[3].name).toBe('Last report');
      expect((columns[3] as ColumnWithRender).sortable).toBe(true);
    });

    describe('Instance column rendering', () => {
      it('renders instance name with metric link for normal service node', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const instanceColumn = columns[0] as ColumnWithRender;

        const mockInstance = {
          serviceNode: 'instance-1',
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{instanceColumn.render!(mockInstance.serviceNode, mockInstance)}</Wrapper>
        );

        expect(
          renderedCell.getByTestId('apmAgentExplorerInstanceListServiceLink')
        ).toBeInTheDocument();
        expect(renderedCell.getByTestId('metric-overview-link')).toBeInTheDocument();
      });

      it('renders special handling for missing service node name', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const instanceColumn = columns[0] as ColumnWithRender;

        const mockInstance = {
          serviceNode: SERVICE_NODE_NAME_MISSING,
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{instanceColumn.render!(mockInstance.serviceNode, mockInstance)}</Wrapper>
        );

        expect(renderedCell.getByTestId('popover-tooltip')).toBeInTheDocument();
        expect(
          renderedCell.getByTestId('apmGetInstanceColumnsConfigurationOptionsLink')
        ).toBeInTheDocument();
      });

      it('handles missing service node with OpenTelemetry agent', () => {
        const otelProps = {
          ...defaultColumnProps,
          agentName: 'opentelemetry/nodejs' as AgentName,
        };

        const columns = getInstanceColumns(otelProps);
        const instanceColumn = columns[0] as ColumnWithRender;

        const mockInstance = {
          serviceNode: SERVICE_NODE_NAME_MISSING,
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{instanceColumn.render!(mockInstance.serviceNode, mockInstance)}</Wrapper>
        );

        expect(renderedCell.getByTestId('popover-tooltip')).toBeInTheDocument();
        const link = renderedCell.getByTestId('apmGetInstanceColumnsConfigurationOptionsLink');
        expect(link).toHaveAttribute('href', otelProps.agentDocsPageUrl);
      });

      it('handles null service node', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const instanceColumn = columns[0] as ColumnWithRender;

        const mockInstance = {
          serviceNode: null,
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{instanceColumn.render!(mockInstance.serviceNode, mockInstance)}</Wrapper>
        );

        expect(
          renderedCell.getByTestId('apmAgentExplorerInstanceListServiceLink')
        ).toBeInTheDocument();
        // Should render span instead of link when serviceNode is null
        expect(renderedCell.container.querySelector('span.eui-textTruncate')).toBeInTheDocument();
      });
    });

    describe('Environment column rendering', () => {
      it('renders environment badge with single environment', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const environmentColumn = columns[1] as ColumnWithRender;

        const mockInstance = {
          serviceNode: 'instance-1',
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{environmentColumn.render!(mockInstance.environments, mockInstance)}</Wrapper>
        );

        expect(renderedCell.getByTestId('environment-badge')).toBeInTheDocument();
        expect(renderedCell.getByText('production')).toBeInTheDocument();
      });

      it('renders environment badge with multiple environments', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const environmentColumn = columns[1] as ColumnWithRender;

        const mockInstance = {
          serviceNode: 'instance-1',
          environments: ['production', 'staging'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{environmentColumn.render!(mockInstance.environments, mockInstance)}</Wrapper>
        );

        expect(renderedCell.getByTestId('environment-badge')).toBeInTheDocument();
        expect(renderedCell.getByText('production, staging')).toBeInTheDocument();
      });
    });

    describe('Agent Version column rendering', () => {
      it('renders agent version badge', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const versionColumn = columns[2] as ColumnWithRender;

        const mockInstance = {
          serviceNode: 'instance-1',
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00Z',
        };

        const renderedCell = render(
          <Wrapper>{versionColumn.render!(mockInstance.agentVersion, mockInstance)}</Wrapper>
        );

        expect(renderedCell.getByTestId('items-badge')).toBeInTheDocument();
        expect(renderedCell.getByText('1.2.3')).toBeInTheDocument();
      });
    });

    describe('Last Report column rendering', () => {
      it('renders timestamp', () => {
        const columns = getInstanceColumns(defaultColumnProps);
        const lastReportColumn = columns[3] as ColumnWithRender;

        const mockInstance = {
          serviceNode: 'instance-1',
          environments: ['production'],
          agentVersion: '1.2.3',
          lastReport: '2023-01-01T12:00:00.000Z',
        };

        const renderedCell = render(
          <Wrapper>{lastReportColumn.render!(mockInstance.lastReport, mockInstance)}</Wrapper>
        );

        expect(renderedCell.getByTestId('timestamp')).toBeInTheDocument();
        expect(renderedCell.getByText('2023-01-01T12:00:00.000Z')).toBeInTheDocument();
      });
    });
  });

  it('handles different agent types', () => {
    const javaProps = {
      ...defaultProps,
      agentName: 'java' as AgentName,
    };

    render(<AgentInstancesDetails {...javaProps} />, renderOptions);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('uses apm params hook for query parameters', () => {
    const customParams = {
      query: {
        environment: 'staging',
        kuery: 'service.name:test',
      },
    };
    mockUseAnyOfApmParams.mockReturnValue(customParams);

    render(<AgentInstancesDetails {...defaultProps} />, renderOptions);

    expect(mockUseAnyOfApmParams).toHaveBeenCalled();
  });

  it('handles comparison enabled state', () => {
    mockGetComparisonEnabled.mockReturnValue(true);

    render(<AgentInstancesDetails {...defaultProps} />, renderOptions);

    expect(mockGetComparisonEnabled).toHaveBeenCalled();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('handles undefined environment', () => {
    const undefinedEnvParams = {
      query: {
        environment: undefined,
        kuery: '',
      },
    };
    mockUseAnyOfApmParams.mockReturnValue(undefinedEnvParams);

    render(<AgentInstancesDetails {...defaultProps} />, renderOptions);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
