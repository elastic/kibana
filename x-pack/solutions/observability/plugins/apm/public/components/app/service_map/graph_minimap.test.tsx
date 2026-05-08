/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ServiceMapGraph } from './graph';
import { getSeverityColor } from '../../../../common/anomaly_detection';
import type { ServiceMapNode } from '../../../../common/service_map';
import { MOCK_EUI_THEME, MOCK_EUI_THEME_FOR_USE_THEME } from './constants';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
  };
});

jest.mock('./use_keyboard_navigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    screenReaderAnnouncement: '',
    setScreenReaderAnnouncement: jest.fn(),
  })),
}));

let mockMinimapProps: Record<string, unknown> = {};

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    ReactFlow: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="react-flow">{children}</div>
    ),
    Background: () => <div data-test-subj="react-flow-background" />,
    Controls: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapControls">{children}</div>
    ),
    MiniMap: (props: Record<string, unknown>) => {
      mockMinimapProps = props;
      return (
        <div
          data-test-subj={props['data-test-subj'] as string}
          aria-label={props.ariaLabel as string}
          data-position={props.position as string}
          data-pannable={String(props.pannable)}
          data-zoomable={String(props.zoomable)}
        />
      );
    },
    useNodesState: jest.fn((initialNodes: unknown) => [initialNodes, jest.fn()]),
    useEdgesState: jest.fn((initialEdges: unknown) => [initialEdges, jest.fn()]),
    useReactFlow: jest.fn(() => ({ fitView: jest.fn() })),
  };
});

jest.mock('./use_edge_highlighting', () => ({
  useEdgeHighlighting: jest.fn(() => ({
    applyEdgeHighlighting: jest.fn((edges: unknown) => edges),
    colors: { primary: MOCK_EUI_THEME.colors.primary, default: '#98A2B3' },
    markers: {},
  })),
}));

jest.mock('./use_reduced_motion', () => ({
  useReducedMotion: jest.fn(() => ({
    prefersReducedMotion: false,
    getAnimationDuration: jest.fn((duration: number) => duration),
  })),
}));

jest.mock('./popover', () => ({
  MapPopover: () => <div data-testid="service-map-popover" />,
}));

jest.mock('../../shared/service_map/layout', () => ({
  applyDagreLayout: jest.fn((nodes: unknown) => nodes),
}));

const createMockServiceNode = (id: string, label: string): ServiceMapNode => ({
  id,
  position: { x: 100, y: 100 },
  data: {
    id,
    label,
    agentName: 'java',
    'service.name': label,
    isService: true as const,
  },
  type: 'service',
});

const createMockDependencyNode = (id: string, label: string): ServiceMapNode => ({
  id,
  position: { x: 100, y: 100 },
  data: {
    id,
    label,
    isService: false as const,
    spanType: 'external',
  },
  type: 'dependency',
});

const defaultProps = {
  height: 600,
  nodes: [createMockServiceNode('service-1', 'Service One')],
  edges: [],
  environment: 'production' as const,
  kuery: '',
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T01:00:00Z',
};

describe('ServiceMapGraph - MiniMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMinimapProps = {};
  });

  it('renders the minimap', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    expect(screen.getByTestId('serviceMapMinimap')).toBeInTheDocument();
  });

  it('is positioned at bottom-right', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const minimap = screen.getByTestId('serviceMapMinimap');
    expect(minimap).toHaveAttribute('data-position', 'bottom-right');
  });

  it('is pannable and zoomable', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const minimap = screen.getByTestId('serviceMapMinimap');
    expect(minimap).toHaveAttribute('data-pannable', 'true');
    expect(minimap).toHaveAttribute('data-zoomable', 'true');
  });

  it('has an accessible aria-label', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const minimap = screen.getByTestId('serviceMapMinimap');
    expect(minimap).toHaveAttribute('aria-label');
    expect(minimap.getAttribute('aria-label')).toContain('minimap');
  });

  it('uses EUI background color', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    expect(mockMinimapProps.bgColor).toBe(MOCK_EUI_THEME_FOR_USE_THEME.colors.backgroundBasePlain);
  });

  it('uses EUI-based mask color', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    expect(mockMinimapProps.maskColor).toBe(`${MOCK_EUI_THEME.colors.lightShade}80`);
  });

  it('renders alongside controls and background within ReactFlow', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const reactFlow = screen.getByTestId('react-flow');
    const minimap = screen.getByTestId('serviceMapMinimap');
    const controls = screen.getByTestId('serviceMapControls');
    const background = screen.getByTestId('react-flow-background');

    expect(reactFlow).toContainElement(minimap);
    expect(reactFlow).toContainElement(controls);
    expect(reactFlow).toContainElement(background);
  });

  describe('nodeColor', () => {
    it('returns primary color for service nodes without anomaly stats', () => {
      render(
        <ReactFlowProvider>
          <ServiceMapGraph {...defaultProps} />
        </ReactFlowProvider>
      );

      const nodeColorFn = mockMinimapProps.nodeColor as (node: ServiceMapNode) => string;
      expect(typeof nodeColorFn).toBe('function');

      const serviceNode = createMockServiceNode('svc-1', 'My Service');
      expect(nodeColorFn(serviceNode)).toBe(MOCK_EUI_THEME.colors.primary);
    });

    it('returns mediumShade for dependency nodes', () => {
      render(
        <ReactFlowProvider>
          <ServiceMapGraph {...defaultProps} />
        </ReactFlowProvider>
      );

      const nodeColorFn = mockMinimapProps.nodeColor as (node: ServiceMapNode) => string;
      const depNode = createMockDependencyNode('dep-1', 'My Dependency');
      expect(nodeColorFn(depNode)).toBe(MOCK_EUI_THEME.colors.mediumShade);
    });

    it('returns primary when service anomaly stats exist without anomaly score', () => {
      render(
        <ReactFlowProvider>
          <ServiceMapGraph {...defaultProps} />
        </ReactFlowProvider>
      );

      const nodeColorFn = mockMinimapProps.nodeColor as (node: ServiceMapNode) => string;

      const partialStatsNode: ServiceMapNode = {
        id: 'svc-partial',
        position: { x: 0, y: 0 },
        data: {
          id: 'svc-partial',
          label: 'Partial stats service',
          isService: true as const,
          agentName: 'java',
          serviceAnomalyStats: {
            transactionType: 'request',
          },
        },
        type: 'service',
      };

      expect(nodeColorFn(partialStatsNode)).toBe(MOCK_EUI_THEME.colors.primary);
      expect(nodeColorFn(createMockServiceNode('svc-1', 'Normal'))).toBe(
        MOCK_EUI_THEME.colors.primary
      );
    });

    it('returns ML severity color from anomaly score when anomalyScore is present', () => {
      render(
        <ReactFlowProvider>
          <ServiceMapGraph {...defaultProps} />
        </ReactFlowProvider>
      );

      const nodeColorFn = mockMinimapProps.nodeColor as (node: ServiceMapNode) => string;

      const scoredNode: ServiceMapNode = {
        id: 'svc-scored',
        position: { x: 0, y: 0 },
        data: {
          id: 'svc-scored',
          label: 'Scored Service',
          isService: true as const,
          agentName: 'java',
          serviceAnomalyStats: {
            anomalyScore: 90,
            jobId: 'test-job',
            transactionType: 'request',
          },
        },
        type: 'service',
      };

      expect(nodeColorFn(scoredNode)).toBe(getSeverityColor(90));
    });
  });
});
