/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ServiceMapGraph } from './graph';
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

jest.mock('./use_service_map_alerts_tab_href', () =>
  jest.requireActual('./use_service_map_alerts_tab_href.test_mock')
);

const mockReactFlow = jest.fn<void, [Record<string, unknown>]>();

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    ReactFlow: (props: Record<string, unknown>) => {
      mockReactFlow(props);
      return <div data-test-subj="react-flow">{props.children as React.ReactNode}</div>;
    },
    Background: () => <div data-test-subj="react-flow-background" />,
    Panel: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapOptionsPanelHost">{children}</div>
    ),
    Controls: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapControls">{children}</div>
    ),
    useNodesState: jest.fn((initialNodes: unknown) => [initialNodes, jest.fn(), jest.fn()]),
    useEdgesState: jest.fn((initialEdges: unknown) => [initialEdges, jest.fn(), jest.fn()]),
    useStore: jest.fn((selector: (state: { width: number; height: number }) => unknown) =>
      selector({ width: 1200, height: 600 })
    ),
    useReactFlow: jest.fn(() => ({
      fitView: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      setCenter: jest.fn(),
      getNodes: jest.fn(() => []),
      getNodesBounds: jest.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    })),
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
  applyServiceMapLayout: jest.fn((nodes: unknown) => nodes),
}));

jest.mock('./service_map_minimap', () => ({
  ServiceMapMinimap: () => <div data-testid="react-flow-minimap" />,
}));

jest.mock('./service_map_diagnostic_button', () => ({
  ServiceMapDiagnosticButton: () => <div data-test-subj="serviceMapDiagnosticButton" />,
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      docLinks: {
        links: {
          apm: {
            supportedServiceMaps: 'https://example.com/docs',
            supportedServiceMapsLegend: 'https://example.com/docs#service-maps-legend',
          },
        },
      },
    },
  }),
}));

const createMockNode = (id: string, label: string): ServiceMapNode => ({
  id,
  position: { x: 100, y: 100 },
  data: {
    id,
    label,
    agentName: 'java',
    'service.name': label,
    isService: true,
    isGrouped: false,
    groupedConnections: [],
    count: 1,
  },
  type: 'service',
});

const defaultProps = {
  height: 600,
  nodes: [createMockNode('service-1', 'Service One')],
  edges: [],
  environment: 'production' as const,
  kuery: '',
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T01:00:00Z',
};

describe('ServiceMapGraph interactivity', () => {
  beforeEach(() => {
    mockReactFlow.mockClear();
  });

  it('wires click/drag handlers into ReactFlow and marks nodes draggable/focusable when interactive', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} isInteractive />
      </ReactFlowProvider>
    );

    const lastProps = mockReactFlow.mock.calls.at(-1)?.[0];
    expect(typeof lastProps?.onNodesChange).toBe('function');
    expect(typeof lastProps?.onEdgesChange).toBe('function');
    expect(typeof lastProps?.onNodeClick).toBe('function');
    expect(typeof lastProps?.onEdgeClick).toBe('function');
    expect(typeof lastProps?.onPaneClick).toBe('function');
    expect(typeof lastProps?.onMoveStart).toBe('function');
    expect(typeof lastProps?.onNodeDragStart).toBe('function');
    expect(lastProps?.nodesDraggable).toBe(true);
    expect(lastProps?.nodesFocusable).toBe(true);
  });

  it('omits click/drag handlers from ReactFlow and disables dragging/focus when not interactive', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} isInteractive={false} />
      </ReactFlowProvider>
    );

    const lastProps = mockReactFlow.mock.calls.at(-1)?.[0];
    expect(lastProps?.onNodesChange).toBeUndefined();
    expect(lastProps?.onEdgesChange).toBeUndefined();
    expect(lastProps?.onNodeClick).toBeUndefined();
    expect(lastProps?.onEdgeClick).toBeUndefined();
    expect(lastProps?.onPaneClick).toBeUndefined();
    expect(lastProps?.onMoveStart).toBeUndefined();
    expect(lastProps?.onNodeDragStart).toBeUndefined();
    expect(lastProps?.nodesDraggable).toBe(false);
    expect(lastProps?.nodesFocusable).toBe(false);
  });
});
