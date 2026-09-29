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
import { ServiceMapGraph } from './graph';
import type { ServiceMapNode } from '../../../../common/service_map';
import { MOCK_EUI_THEME, MOCK_EUI_THEME_FOR_USE_THEME } from './constants';

vi.mock('@elastic/eui', async () => {
  const original = await vi.importActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
  };
});

vi.mock('../../../context/apm_plugin/use_apm_plugin_context', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

let mockScreenReaderAnnouncementValue = '';
const mockSetScreenReaderAnnouncement = vi.fn();

vi.mock('./use_keyboard_navigation', () => {
  const mocked = {
    useKeyboardNavigation: vi.fn(() => ({
      get screenReaderAnnouncement() {
        return mockScreenReaderAnnouncementValue;
      },
      setScreenReaderAnnouncement: mockSetScreenReaderAnnouncement,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  './use_service_map_alerts_tab_href',
  async () => await vi.importActual('./use_service_map_alerts_tab_href.test_mock')
);

vi.mock('@xyflow/react', () => {
  const original = require('@xyflow/react');
  return {
    ...original,
    ReactFlow: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="react-flow">{children}</div>
    ),
    Background: () => <div data-testid="react-flow-background" />,
    Panel: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="react-flow-panel">{children}</div>
    ),
    Controls: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="react-flow-controls">{children}</div>
    ),
    useNodesState: vi.fn((initialNodes) => [initialNodes, vi.fn()]),
    useEdgesState: vi.fn((initialEdges) => [initialEdges, vi.fn()]),
    useStore: vi.fn((selector: (state: { width: number; height: number }) => unknown) =>
      selector({ width: 1200, height: 600 })
    ),
    useReactFlow: vi.fn(() => ({
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      setCenter: vi.fn(),
      getNodes: vi.fn(() => []),
      getNodesBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    })),
  };
});
vi.mock('./use_edge_highlighting', () => {
  const mocked = {
    useEdgeHighlighting: vi.fn(() => ({
      applyEdgeHighlighting: vi.fn((edges) => edges),
      colors: { primary: MOCK_EUI_THEME.colors.primary, default: '#98A2B3' },
      markers: {},
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_reduced_motion', () => {
  const mocked = {
    useReducedMotion: vi.fn(() => ({
      prefersReducedMotion: false,
      getAnimationDuration: vi.fn((duration) => duration),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./popover', () => {
  const mocked = {
    MapPopover: () => <div data-testid="service-map-popover" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../shared/service_map/layout', () => {
  const mocked = {
    applyDagreLayout: vi.fn((nodes) => nodes),
    applyServiceMapLayout: vi.fn((nodes) => nodes),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./service_map_minimap', () => {
  const mocked = {
    ServiceMapMinimap: () => <div data-testid="react-flow-minimap" />,
  };
  return { ...mocked, default: mocked };
});

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

describe('ServiceMapGraph - Screen Reader Announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenReaderAnnouncementValue = '';
  });

  it('renders EuiScreenReaderLive with proper ARIA attributes', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders EuiScreenReaderLive within the service map container', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const serviceMapContainer = screen.getByTestId('serviceMapGraph');
    const liveRegion = screen.getByRole('status');

    expect(serviceMapContainer).toContainElement(liveRegion);
  });

  it('displays screen reader instructions with proper ID', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const instructions = screen.getByText(/This is an interactive service map/i);
    expect(instructions).toBeInTheDocument();
    expect(instructions).toHaveAttribute('id');
    expect(instructions.getAttribute('id')).toMatch(/^serviceMap/);
  });

  it('links service map container to instructions via aria-describedby', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const serviceMapContainer = screen.getByTestId('serviceMapGraph');
    const instructions = screen.getByText(/This is an interactive service map/i);
    const instructionsId = instructions.getAttribute('id');

    expect(serviceMapContainer).toHaveAttribute('aria-describedby', instructionsId);
  });

  it('includes node count in aria-label', () => {
    const nodes = [
      createMockNode('service-1', 'Service One'),
      createMockNode('service-2', 'Service Two'),
      createMockNode('service-3', 'Service Three'),
    ];

    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} nodes={nodes} />
      </ReactFlowProvider>
    );

    const serviceMapContainer = screen.getByTestId('serviceMapGraph');
    expect(serviceMapContainer).toHaveAttribute(
      'aria-label',
      expect.stringContaining('3 services')
    );
  });

  it('has proper role and tabIndex on service map container', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const serviceMapContainer = screen.getByTestId('serviceMapGraph');
    expect(serviceMapContainer).toHaveAttribute('role', 'group');
    expect(serviceMapContainer).toHaveAttribute('tabIndex', '0');
  });

  it('instructions contain keyboard navigation guidance', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const instructions = screen.getByText(/This is an interactive service map/i);
    expect(instructions.textContent).toContain('Tab');
    expect(instructions.textContent).toContain('Arrow keys');
    expect(instructions.textContent).toContain('Enter or Space');
    expect(instructions.textContent).toContain('Escape');
    expect(instructions.textContent).toMatch(/Command K|Control K/);
  });
});
