/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { MOCK_DEFAULT_COLOR, MOCK_EUI_THEME } from './constants';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '@kbn/observability-shared-plugin/common';

// Mock the EUI theme
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          primary: MOCK_EUI_THEME.colors.primary,
          backgroundBasePlain: MOCK_EUI_THEME.colors.backgroundBasePlain,
          lightShade: MOCK_EUI_THEME.colors.lightShade,
          textPrimary: MOCK_EUI_THEME.colors.textPrimary,
          textParagraph: MOCK_EUI_THEME.colors.textParagraph,
          text: MOCK_EUI_THEME.colors.textPrimary,
          mediumShade: MOCK_EUI_THEME.colors.mediumShade,
        },
        size: {
          xs: '4px',
          s: '8px',
          m: '12px',
          l: '24px',
          xxs: '2px',
        },
        border: {
          radius: { medium: '4px' },
          width: { thin: '1px', thick: '2px' },
        },
        levels: { header: 1000, menu: 2000 },
        font: { family: 'Inter, sans-serif' },
      },
      colorMode: 'LIGHT',
    }),
  };
});

// Mock APM plugin context
jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      uiSettings: {
        get: jest.fn().mockReturnValue(false),
      },
    },
  }),
}));

// Mock APM router
jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({
    link: jest.fn((path: string) => `/app/apm${path}`),
  }),
}));

// Mock APM params
jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      comparisonEnabled: false,
      offset: undefined,
    },
  }),
}));

// Mock time range hook
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2023-01-01T00:00:00.000Z',
    end: '2023-01-01T01:00:00.000Z',
  }),
}));

// Mock fetcher
jest.mock('../../../hooks/use_fetcher', () => ({
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
}));

// Mock useReactFlow
const mockGetViewport = jest.fn(() => ({ x: 0, y: 0, zoom: 1 }));
const mockGetNode = jest.fn((id: string) => ({ id, measured: { width: 56, height: 56 } }));
const mockGetZoom = jest.fn(() => 1);
const mockSetCenter = jest.fn();

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
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

describe('MapPopover', () => {
  const defaultProps = {
    selectedNode: null,
    selectedEdge: null,
    focusedServiceName: undefined,
    environment: 'ENVIRONMENT_ALL' as const,
    kuery: '',
    start: '2023-01-01T00:00:00.000Z',
    end: '2023-01-01T01:00:00.000Z',
    onClose: jest.fn(),
  };

  const renderPopover = (props = {}) => {
    return render(
      <ReactFlowProvider>
        <MapPopover {...defaultProps} {...props} />
      </ReactFlowProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    const onClose = jest.fn();
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
});
