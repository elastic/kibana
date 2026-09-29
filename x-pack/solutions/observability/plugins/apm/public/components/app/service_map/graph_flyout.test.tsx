/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import { MOCK_EUI_THEME_FOR_USE_THEME } from './constants';
import { ServiceMapGraph } from './graph';

vi.mock('@elastic/eui', async () => {
  const original = await vi.importActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
    useGeneratedHtmlId: () => 'service-map-test-id',
  };
});

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        telemetry: {
          reportServiceMapDagreLayoutFallback: vi.fn(),
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../context/apm_plugin/use_apm_plugin_context', () => {
  const mocked = {
    useApmPluginContext: () => ({
      core: {},
      share: {},
      lens: {},
      dataViews: {},
      plugins: {},
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@xyflow/react', () => {
  const original = require('@xyflow/react');
  return {
    ...original,
    ReactFlow: ({
      children,
      nodes,
      onNodeClick,
      onPaneClick,
      onMoveStart,
      onNodeDragStart,
    }: {
      children: React.ReactNode;
      nodes: ServiceMapNode[];
      onNodeClick?: (event: React.MouseEvent, node: ServiceMapNode) => void;
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
        <button data-test-subj="serviceMapPaneClick" onClick={(event) => onPaneClick?.(event)} />
        <button data-test-subj="serviceMapMoveStart" onClick={() => onMoveStart?.()} />
        <button data-test-subj="serviceMapNodeDragStart" onClick={() => onNodeDragStart?.()} />
        {children}
      </div>
    ),
    Background: () => null,
    Panel: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useNodesState: vi.fn((initialNodes: ServiceMapNode[]) => [initialNodes, vi.fn(), vi.fn()]),
    useEdgesState: vi.fn((initialEdges: unknown[]) => [initialEdges, vi.fn(), vi.fn()]),
    useReactFlow: vi.fn(() => ({
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    })),
  };
});

vi.mock('../../shared/service_map/layout', () => {
  const mocked = {
    applyDagreLayout: vi.fn((nodes: ServiceMapNode[]) => nodes),
    applyServiceMapLayout: vi.fn((nodes: unknown) => nodes),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_edge_highlighting', () => {
  const mocked = {
    useEdgeHighlighting: () => ({
      applyEdgeHighlighting: vi.fn((edges: unknown) => edges),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_reduced_motion', () => {
  const mocked = {
    useReducedMotion: () => ({
      getAnimationDuration: vi.fn((duration: number) => duration),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_keyboard_navigation', () => {
  const mocked = {
    useKeyboardNavigation: () => ({
      screenReaderAnnouncement: '',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./service_map_minimap', () => {
  const mocked = {
    ServiceMapMinimap: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./service_map_legend', () => {
  const mocked = {
    ServiceMapLegend: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./service_map_options_panel', () => {
  const mocked = {
    ServiceMapOptionsPanel: () => null,
    ServiceMapOptionsPanelToggle: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  './use_service_map_alerts_tab_href',
  async () => await vi.importActual('./use_service_map_alerts_tab_href.test_mock')
);

vi.mock('./popover', () => {
  const mocked = {
    MapPopover: ({ selectedNode }: { selectedNode: ServiceMapNode | null }) =>
      selectedNode ? (
        <div data-test-subj="serviceMapPopoverMock">{selectedNode.data.label}</div>
      ) : null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../shared/service_flyout', () => {
  const mocked = {
    ServiceFlyout: ({ service }: { service: { name: string } }) => (
      <div data-test-subj="serviceFlyoutMock">{service.name}</div>
    ),
  };
  return { ...mocked, default: mocked };
});

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
  data: { isBidirectional: false },
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
