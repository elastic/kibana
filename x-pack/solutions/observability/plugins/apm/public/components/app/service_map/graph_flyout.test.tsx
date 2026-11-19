/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import { MOCK_EUI_THEME_FOR_USE_THEME } from './constants';
import { ServiceMapGraph } from './graph';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
    useGeneratedHtmlId: () => 'service-map-test-id',
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      telemetry: {
        reportServiceMapDagreLayoutFallback: jest.fn(),
      },
    },
  }),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {},
    share: {},
    lens: {},
    dataViews: {},
    plugins: {},
  }),
}));

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    ReactFlow: ({
      children,
      nodes,
      edges,
      onNodeClick,
      onEdgeClick,
      onPaneClick,
      onMoveStart,
      onNodeDragStart,
    }: {
      children: React.ReactNode;
      nodes: ServiceMapNode[];
      edges: ServiceMapEdge[];
      onNodeClick?: (event: React.MouseEvent, node: ServiceMapNode) => void;
      onEdgeClick?: (event: React.MouseEvent, edge: ServiceMapEdge) => void;
      onPaneClick?: (event: React.MouseEvent) => void;
      onMoveStart?: () => void;
      onNodeDragStart?: () => void;
    }) => (
      <div data-test-subj="reactFlow">
        {nodes.map((node) => (
          <button
            key={node.id}
            data-test-subj={`serviceMapNode-${node.id}`}
            onClick={(event) => onNodeClick?.(event, node)}
          >
            {node.data.label}
          </button>
        ))}
        {edges.map((edge) => (
          <button
            key={edge.id}
            data-test-subj={`serviceMapEdge-${edge.id}`}
            onClick={(event) => onEdgeClick?.(event, edge)}
          />
        ))}
        <button data-test-subj="serviceMapPaneClick" onClick={(event) => onPaneClick?.(event)} />
        <button data-test-subj="serviceMapMoveStart" onClick={() => onMoveStart?.()} />
        <button data-test-subj="serviceMapNodeDragStart" onClick={() => onNodeDragStart?.()} />
        {children}
      </div>
    ),
    Background: () => null,
    Panel: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useNodesState: jest.fn((initialNodes: ServiceMapNode[]) => [
      initialNodes,
      jest.fn(),
      jest.fn(),
    ]),
    useEdgesState: jest.fn((initialEdges: unknown[]) => [initialEdges, jest.fn(), jest.fn()]),
    useReactFlow: jest.fn(() => ({
      fitView: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
    })),
  };
});

jest.mock('../../shared/service_map/layout', () => ({
  applyDagreLayout: jest.fn((nodes: ServiceMapNode[]) => nodes),
  applyServiceMapLayout: jest.fn((nodes: unknown) => nodes),
}));

jest.mock('./use_edge_highlighting', () => ({
  useEdgeHighlighting: () => ({
    applyEdgeHighlighting: jest.fn((edges: unknown) => edges),
  }),
}));

jest.mock('./use_reduced_motion', () => ({
  useReducedMotion: () => ({
    getAnimationDuration: jest.fn((duration: number) => duration),
  }),
}));

jest.mock('./use_keyboard_navigation', () => ({
  useKeyboardNavigation: () => ({
    screenReaderAnnouncement: '',
  }),
}));

jest.mock('./service_map_minimap', () => ({
  ServiceMapMinimap: () => null,
}));

jest.mock('./service_map_legend', () => ({
  ServiceMapLegend: () => null,
}));

jest.mock('./service_map_options_panel', () => ({
  ServiceMapOptionsPanel: () => null,
  ServiceMapOptionsPanelToggle: () => null,
}));

jest.mock('./use_service_map_alerts_tab_href', () =>
  jest.requireActual('./use_service_map_alerts_tab_href.test_mock')
);

jest.mock('./popover', () => ({
  MapPopover: ({ selectedNode }: { selectedNode: ServiceMapNode | null }) =>
    selectedNode ? (
      <div data-test-subj="serviceMapPopoverMock">{selectedNode.data.label}</div>
    ) : null,
}));

jest.mock('../../shared/service_flyout', () => ({
  ServiceFlyout: ({ service }: { service: { name: string } }) => (
    <div data-test-subj="serviceFlyoutMock">{service.name}</div>
  ),
}));

jest.mock('../../shared/request_flyout', () => ({
  RequestFlyout: ({
    connection,
    onClose,
  }: {
    connection: { sourceLabel: string; targetLabel: string };
    onClose: () => void;
  }) => (
    <div data-test-subj="requestFlyoutMock">
      {connection.sourceLabel} → {connection.targetLabel}
      <button data-test-subj="requestFlyoutMockClose" onClick={onClose} />
    </div>
  ),
}));

const serviceNode: ServiceMapNode = {
  id: 'opbeans-java',
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id: 'opbeans-java',
    label: 'opbeans-java',
    isService: true,
    agentName: 'java',
  },
};

const dependencyNode: ServiceMapNode = {
  id: 'postgresql',
  type: 'dependency',
  position: { x: 100, y: 0 },
  data: {
    id: 'postgresql',
    label: 'postgresql',
    isService: false,
    spanType: 'db',
    spanSubtype: 'postgresql',
  },
};

// A dependency node is only visible on the map when connected to a visible
// service node, so wire an edge to keep `postgresql` (and its popover) present.
const serviceToDependencyEdge: ServiceMapEdge = {
  id: 'opbeans-java~postgresql',
  source: 'opbeans-java',
  target: 'postgresql',
  data: {
    isBidirectional: false,
    sourceData: { id: 'opbeans-java', 'service.name': 'opbeans-java' },
    targetData: {
      id: 'postgresql',
      'span.destination.service.resource': 'postgresql',
      'span.type': 'db',
      'span.subtype': 'postgresql',
    },
    resources: ['postgresql'],
  },
} as ServiceMapEdge;

const defaultProps = {
  height: 600,
  nodes: [serviceNode, dependencyNode],
  edges: [serviceToDependencyEdge],
  environment: 'ENVIRONMENT_ALL' as const,
  kuery: '',
  start: '2024-01-01T00:00:00.000Z',
  end: '2024-01-01T01:00:00.000Z',
};

describe('ServiceMapGraph service flyout selection', () => {
  it('opens the service flyout for service nodes', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-opbeans-java'));

    expect(screen.getByTestId('serviceFlyoutMock')).toHaveTextContent('opbeans-java');
    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
  });

  it('opens the service flyout for service nodes in embedded service maps', () => {
    render(<ServiceMapGraph {...defaultProps} isEmbedded />);

    fireEvent.click(screen.getByTestId('serviceMapNode-opbeans-java'));

    expect(screen.getByTestId('serviceFlyoutMock')).toHaveTextContent('opbeans-java');
    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
  });

  it('keeps the service flyout open when clicking empty map space', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-opbeans-java'));
    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('serviceMapPaneClick'));

    expect(screen.getByTestId('serviceFlyoutMock')).toHaveTextContent('opbeans-java');
  });

  it('keeps the service flyout open when panning or dragging the map', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-opbeans-java'));
    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('serviceMapMoveStart'));
    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('serviceMapNodeDragStart'));
    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();
  });

  it('still closes the dependency popover when clicking empty map space', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-postgresql'));
    expect(screen.getByTestId('serviceMapPopoverMock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('serviceMapPaneClick'));

    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
  });
});

describe('ServiceMapGraph request flyout selection', () => {
  it('opens the request flyout, not a popover, for edges', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapEdge-opbeans-java~postgresql'));

    expect(screen.getByTestId('requestFlyoutMock')).toHaveTextContent('opbeans-java → postgresql');
    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
  });

  it('keeps the request flyout open when clicking empty map space or dragging the map', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapEdge-opbeans-java~postgresql'));
    fireEvent.click(screen.getByTestId('serviceMapPaneClick'));
    fireEvent.click(screen.getByTestId('serviceMapMoveStart'));
    fireEvent.click(screen.getByTestId('serviceMapNodeDragStart'));

    expect(screen.getByTestId('requestFlyoutMock')).toBeInTheDocument();
  });

  it('closes the request flyout from the flyout', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapEdge-opbeans-java~postgresql'));
    fireEvent.click(screen.getByTestId('requestFlyoutMockClose'));

    expect(screen.queryByTestId('requestFlyoutMock')).not.toBeInTheDocument();
  });

  it('replaces the request flyout when a node is selected', () => {
    render(<ServiceMapGraph {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceMapEdge-opbeans-java~postgresql'));
    fireEvent.click(screen.getByTestId('serviceMapNode-opbeans-java'));

    expect(screen.queryByTestId('requestFlyoutMock')).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();
  });

  it('does not keep an edge selected when it cannot open a flyout', () => {
    const edgeWithoutSource = {
      ...serviceToDependencyEdge,
      data: { isBidirectional: false, targetData: serviceToDependencyEdge.data?.targetData },
    } as ServiceMapEdge;
    render(<ServiceMapGraph {...defaultProps} edges={[edgeWithoutSource]} />);

    fireEvent.click(screen.getByTestId('serviceMapEdge-opbeans-java~postgresql'));

    expect(screen.queryByTestId('requestFlyoutMock')).not.toBeInTheDocument();
  });
});
