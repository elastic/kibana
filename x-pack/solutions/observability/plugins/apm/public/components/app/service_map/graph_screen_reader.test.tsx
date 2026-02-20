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
import type { ServiceMapNode } from '../../../../common/service_map';
import { MOCK_EUI_THEME } from './constants';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          backgroundBasePlain: MOCK_EUI_THEME.colors.backgroundBasePlain,
          lightShade: MOCK_EUI_THEME.colors.lightShade,
          text: MOCK_EUI_THEME.colors.text,
          primary: MOCK_EUI_THEME.colors.primary,
        },
        size: {
          xs: '4px',
          s: '8px',
          m: '12px',
          l: '24px',
          xl: '32px',
        },
        border: {
          radius: {
            medium: '6px',
          },
          width: {
            thin: '1px',
            thick: '2px',
          },
        },
        levels: {
          content: 1000,
        },
        shadows: {
          s: '0 1px 2px rgba(0,0,0,0.1)',
        },
      },
    }),
  };
});
let mockScreenReaderAnnouncementValue = '';
const mockSetScreenReaderAnnouncement = jest.fn();

jest.mock('./use_keyboard_navigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    get screenReaderAnnouncement() {
      return mockScreenReaderAnnouncementValue;
    },
    setScreenReaderAnnouncement: mockSetScreenReaderAnnouncement,
  })),
}));
jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    ReactFlow: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="react-flow">{children}</div>
    ),
    Background: () => <div data-testid="react-flow-background" />,
    Controls: () => <div data-testid="react-flow-controls" />,
    useNodesState: jest.fn((initialNodes) => [initialNodes, jest.fn()]),
    useEdgesState: jest.fn((initialEdges) => [initialEdges, jest.fn()]),
    useReactFlow: jest.fn(() => ({
      fitView: jest.fn(),
    })),
  };
});
jest.mock('./use_edge_highlighting', () => ({
  useEdgeHighlighting: jest.fn(() => ({
    applyEdgeHighlighting: jest.fn((edges) => edges),
    colors: { primary: MOCK_EUI_THEME.colors.primary, default: '#98A2B3' },
    markers: {},
  })),
}));

jest.mock('./use_reduced_motion', () => ({
  useReducedMotion: jest.fn(() => ({
    prefersReducedMotion: false,
    getAnimationDuration: jest.fn((duration) => duration),
  })),
}));

jest.mock('./popover', () => ({
  MapPopover: () => <div data-testid="service-map-popover" />,
}));

jest.mock('./layout', () => ({
  applyDagreLayout: jest.fn((nodes) => nodes),
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

describe('ServiceMapGraph - Screen Reader Announcements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
