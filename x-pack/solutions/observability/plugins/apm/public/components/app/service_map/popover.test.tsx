/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { MapPopover } from './popover';
import type {
  ServiceMapNode,
  ServiceNodeData,
  DependencyNodeData,
  GroupedNodeData,
  ServiceMapEdge,
} from '../../../../common/service_map';
import { MarkerType } from '@xyflow/react';
import { MOCK_DEFAULT_COLOR, MOCK_EUI_THEME_FOR_USE_THEME } from './constants';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '@kbn/observability-shared-plugin/common';

vi.mock('@elastic/eui', async () => {
  const original = (await vi.importActual('@elastic/eui'));
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: MOCK_EUI_THEME_FOR_USE_THEME,
      colorMode: 'LIGHT',
    }),
  };
});

// Mock APM plugin context
vi.mock('../../../context/apm_plugin/use_apm_plugin_context', () => {
      const mocked = {
      useApmPluginContext: () => ({
        core: {
          uiSettings: {
            get: vi.fn().mockReturnValue(false),
          },
          application: {
            capabilities: {
              slo: { read: true },
            },
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_apm_route_path', () => {
      const mocked = {
      useApmRoutePath: () => '/service-map',
    };
      return { ...mocked, default: mocked };
    });

// Mock APM router
vi.mock('../../../hooks/use_apm_router', () => {
      const mocked = {
      useApmRouter: () => ({
        link: vi.fn((path: string) => `/app/apm${path}`),
      }),
    };
      return { ...mocked, default: mocked };
    });

// Mock APM params
vi.mock('../../../hooks/use_apm_params', () => {
      const mocked = {
      useAnyOfApmParams: () => ({
        query: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          comparisonEnabled: false,
          offset: undefined,
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

// Mock time range hook
vi.mock('../../../hooks/use_time_range', () => {
      const mocked = {
      useTimeRange: () => ({
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-01T01:00:00.000Z',
      }),
    };
      return { ...mocked, default: mocked };
    });

// Mock fetcher
vi.mock('../../../hooks/use_fetcher', () => {
      const mocked = {
      FETCH_STATUS: {
        LOADING: 'loading',
        SUCCESS: 'success',
        FAILURE: 'failure',
        NOT_INITIATED: 'not_initiated',
      },
      useFetcher: () => ({
        data: { currentPeriod: {}, previousPeriod: undefined },
        status: 'success',
      }),
    };
      return { ...mocked, default: mocked };
    });

// Mock useReactFlow
const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }));
const mockGetNode = vi.fn((id: string) => ({ id, measured: { width: 56, height: 56 } }));
const mockGetZoom = vi.fn(() => 1);
const mockSetCenter = vi.fn();

vi.mock('@xyflow/react', () => {
  const original = require('@xyflow/react');
  return {
    ...original,
    useReactFlow: () => ({
      getViewport: mockGetViewport,
      getNode: mockGetNode,
      getZoom: mockGetZoom,
      setCenter: mockSetCenter,
    }),
  };
});

// Mock service map components
vi.mock('./popover/edge_contents', () => {
      const mocked = {
      EdgeContents: vi.fn(() => <div data-testid="edge-contents" />),
    };
      return { ...mocked, default: mocked };
    });

describe('MapPopover', () => {
  const defaultProps = {
    selectedNode: null,
    selectedEdge: null,
    focusedServiceName: undefined,
    environment: 'ENVIRONMENT_ALL' as const,
    kuery: '',
    start: '2023-01-01T00:00:00.000Z',
    end: '2023-01-01T01:00:00.000Z',
    onClose: vi.fn(),
  };

  const renderPopover = (props = {}) => {
    return render(
      <ReactFlowProvider>
        <MapPopover {...defaultProps} {...props} />
      </ReactFlowProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show popover content when no node is selected', () => {
    renderPopover();

    expect(screen.queryByTestId('serviceMapPopoverContent')).not.toBeInTheDocument();
  });

  it('renders popover when a service node is selected', () => {
    const serviceNode: ServiceMapNode = {
      id: 'test-service',
      type: 'service',
      position: { x: 100, y: 100 },
      data: {
        id: 'test-service',
        label: 'Test Service',
        isService: true,
        agentName: 'nodejs',
      } as ServiceNodeData,
    };

    renderPopover({ selectedNode: serviceNode });

    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
    expect(screen.getByText('Test Service')).toBeInTheDocument();
  });

  it('renders popover when a dependency node is selected', () => {
    const dependencyNode: ServiceMapNode = {
      id: 'test-dependency',
      type: 'dependency',
      position: { x: 200, y: 200 },
      data: {
        id: 'test-dependency',
        label: 'elasticsearch',
        isService: false,
        spanType: 'db',
        spanSubtype: 'elasticsearch',
      } as DependencyNodeData,
    };

    renderPopover({ selectedNode: dependencyNode });

    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
    expect(screen.getByText('elasticsearch')).toBeInTheDocument();
  });

  it('shows dependency name without ">" in title when node id has prefix', () => {
    const dependencyNode: ServiceMapNode = {
      id: '>postgresql',
      type: 'dependency',
      position: { x: 200, y: 200 },
      data: {
        id: '>postgresql',
        label: 'postgresql',
        isService: false,
        spanType: 'db',
        spanSubtype: 'postgresql',
      } as DependencyNodeData,
    };

    renderPopover({ selectedNode: dependencyNode });

    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
    expect(screen.getByTestId('serviceMapPopoverTitle')).toHaveTextContent('postgresql');
    expect(screen.getByTestId('serviceMapPopoverTitle')).not.toHaveTextContent('>postgresql');
  });

  it('renders popover when a grouped resources node is selected', () => {
    const groupedNode: ServiceMapNode = {
      id: 'grouped-resources',
      type: 'groupedResources',
      position: { x: 300, y: 300 },
      data: {
        id: 'grouped-resources',
        label: '3 resources',
        isService: false,
        isGrouped: true,
        spanType: 'external',
        groupedConnections: [
          { id: 'resource-1', label: 'Resource 1', spanType: 'external', spanSubtype: 'http' },
          { id: 'resource-2', label: 'Resource 2', spanType: 'external', spanSubtype: 'https' },
          { id: 'resource-3', label: 'Resource 3', spanType: 'external', spanSubtype: 'grpc' },
        ],
        count: 3,
      } as GroupedNodeData,
    };

    renderPopover({ selectedNode: groupedNode });

    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
    expect(screen.getByText('3 resources')).toBeInTheDocument();
  });

  it('calls onClose when popover is closed', () => {
    const onClose = vi.fn();
    const serviceNode: ServiceMapNode = {
      id: 'test-service',
      type: 'service',
      position: { x: 100, y: 100 },
      data: {
        id: 'test-service',
        label: 'Test Service',
        isService: true,
      } as ServiceNodeData,
    };

    renderPopover({ selectedNode: serviceNode, onClose });

    // The popover should be open
    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
  });

  it('shows KQL filter tip when kuery is provided', () => {
    const serviceNode: ServiceMapNode = {
      id: 'test-service',
      type: 'service',
      position: { x: 100, y: 100 },
      data: {
        id: 'test-service',
        label: 'Test Service',
        isService: true,
      } as ServiceNodeData,
    };

    renderPopover({ selectedNode: serviceNode, kuery: 'service.name: test' });

    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
  });

  it('renders popover when an edge is selected and shows display names without ">"', () => {
    const edge: ServiceMapEdge = {
      id: 'service-a~>postgresql',
      source: 'service-a',
      target: '>postgresql',
      type: 'default',
      style: { stroke: MOCK_DEFAULT_COLOR, strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: MOCK_DEFAULT_COLOR },
      data: {
        isBidirectional: false,
        sourceLabel: 'Service A',
        targetLabel: 'postgresql',
        sourceData: {
          id: 'service-a',
          [SERVICE_NAME]: 'Service A',
          [AGENT_NAME]: 'test-agent',
          [SERVICE_ENVIRONMENT]: null,
        },
        targetData: {
          id: '>postgresql',
          [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql',
          [SPAN_TYPE]: 'external',
          [SPAN_SUBTYPE]: 'http',
        },
        resources: ['postgresql'],
      },
    };

    mockGetNode.mockImplementation((id: string) => ({
      id,
      position: { x: id === 'service-a' ? 0 : 200, y: 100 },
      measured: { width: 56, height: 56 },
    }));

    renderPopover({ selectedEdge: edge });

    expect(screen.getByTestId('serviceMapPopover')).toBeInTheDocument();
    expect(screen.getByTestId('serviceMapPopoverTitle')).toHaveTextContent(
      'Service A → postgresql'
    );
    expect(screen.getByTestId('serviceMapPopoverTitle')).not.toHaveTextContent('>postgresql');
  });

  it('does not show popover content when neither node nor edge is selected', () => {
    renderPopover();
    expect(screen.queryByTestId('serviceMapPopoverContent')).not.toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('service node popover content has accessible structure', () => {
      const serviceNode: ServiceMapNode = {
        id: 'opbeans-java',
        type: 'service',
        position: { x: 100, y: 100 },
        data: {
          id: 'opbeans-java',
          label: 'opbeans-java',
          isService: true,
          agentName: 'java',
        } as ServiceNodeData,
      };

      renderPopover({ selectedNode: serviceNode });

      const content = screen.getByTestId('serviceMapPopoverContent');
      expect(content).toBeInTheDocument();

      const heading = screen.getByTestId('serviceMapPopoverTitle');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveTextContent('opbeans-java');
    });

    it('dependency node popover content has accessible heading', () => {
      const dependencyNode: ServiceMapNode = {
        id: '>postgresql',
        type: 'dependency',
        position: { x: 200, y: 200 },
        data: {
          id: '>postgresql',
          label: 'postgresql',
          isService: false,
        } as DependencyNodeData,
      };

      renderPopover({ selectedNode: dependencyNode });

      const content = screen.getByTestId('serviceMapPopoverContent');
      expect(content).toBeInTheDocument();
      const heading = screen.getByTestId('serviceMapPopoverTitle');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveTextContent('postgresql');
    });
  });
});
