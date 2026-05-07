/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    ReactFlow: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="react-flow">{children}</div>
    ),
    Background: () => <div data-test-subj="react-flow-background" />,
    Panel: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapOptionsPanelHost">{children}</div>
    ),
    Controls: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapControls">{children}</div>
    ),
    useNodesState: jest.fn((initialNodes: unknown) => [initialNodes, jest.fn()]),
    useEdgesState: jest.fn((initialEdges: unknown) => [initialEdges, jest.fn()]),
    useReactFlow: jest.fn(() => ({
      fitView: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      setCenter: jest.fn(),
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
}));

jest.mock('./service_map_minimap', () => ({
  ServiceMapMinimap: () => <div data-testid="react-flow-minimap" />,
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

/** Wrapper that holds fullscreen state so the graph re-renders with new isFullscreen on toggle (for testing). */
function ServiceMapGraphWithFullscreenState(
  props: React.ComponentProps<typeof ServiceMapGraph> & { initialFullscreen: boolean }
) {
  const { initialFullscreen, ...rest } = props;
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  return (
    <ServiceMapGraph
      {...rest}
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
    />
  );
}

describe('ServiceMapGraph - Controls', () => {
  it('renders the controls container', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const controls = screen.getByTestId('serviceMapControls');
    expect(controls).toBeInTheDocument();
    expect(screen.getByTestId('serviceMapGraph')).toContainElement(controls);
  });

  it('does not render full screen button when onToggleFullscreen is not provided', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    expect(screen.queryByTestId('serviceMapFullScreenButton')).not.toBeInTheDocument();
  });

  it('renders full screen button when onToggleFullscreen is provided and toggles state on click', async () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraphWithFullscreenState {...defaultProps} initialFullscreen={false} />
      </ReactFlowProvider>
    );

    const fullscreenButton = screen.getByTestId('serviceMapFullScreenButton');
    expect(fullscreenButton).toBeInTheDocument();
    expect(fullscreenButton).toHaveAttribute('title', 'Enter fullscreen');

    await act(async () => {
      fullscreenButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('serviceMapFullScreenButton')).toHaveAttribute(
        'title',
        'Exit fullscreen (esc)'
      );
    });
  });

  it('shows exit fullscreen when isFullscreen is true and toggles to enter on button click', async () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraphWithFullscreenState {...defaultProps} initialFullscreen={true} />
      </ReactFlowProvider>
    );

    const fullscreenButton = screen.getByTestId('serviceMapFullScreenButton');
    expect(fullscreenButton).toHaveAttribute('title', 'Exit fullscreen (esc)');

    await act(async () => {
      fullscreenButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('serviceMapFullScreenButton')).toHaveAttribute(
        'title',
        'Enter fullscreen'
      );
    });
  });

  it('renders "View full service map" button when fullMapHref is provided', () => {
    const fullMapHref = '/app/apm/service-map?rangeFrom=now-24h&rangeTo=now';
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} fullMapHref={fullMapHref} />
      </ReactFlowProvider>
    );

    const viewFullMapButton = screen.getByTestId('serviceMapViewFullMapButton');
    expect(viewFullMapButton).toBeInTheDocument();
    expect(viewFullMapButton).toHaveAttribute('href', fullMapHref);
    expect(viewFullMapButton).toHaveAttribute('title', 'View full service map');
  });

  it('does not render "View full service map" button when fullMapHref is not provided', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    expect(screen.queryByTestId('serviceMapViewFullMapButton')).not.toBeInTheDocument();
  });

  it('renders both view full map and fullscreen buttons when both fullMapHref and onToggleFullscreen are provided', () => {
    const fullMapHref = '/app/apm/service-map?rangeFrom=now-24h&rangeTo=now';
    render(
      <ReactFlowProvider>
        <ServiceMapGraph
          {...defaultProps}
          fullMapHref={fullMapHref}
          onToggleFullscreen={() => {}}
        />
      </ReactFlowProvider>
    );

    const controls = screen.getByTestId('serviceMapControls');
    const viewFullMapButton = screen.getByTestId('serviceMapViewFullMapButton');
    const fullscreenButton = screen.getByTestId('serviceMapFullScreenButton');

    expect(controls).toContainElement(viewFullMapButton);
    expect(controls).toContainElement(fullscreenButton);
  });

  it('focuses find in page on Ctrl+K when focus is on document body (e.g. after load)', async () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    await act(async () => {
      document.body.focus();
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId('serviceMapControlsSearch')).toHaveFocus();
    });
  });

  it('expands the options panel and focuses find on Ctrl+K when the panel was collapsed', async () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('serviceMapHideControlsButton'));
    });
    expect(screen.queryByTestId('serviceMapControlsSearch')).not.toBeInTheDocument();

    await act(async () => {
      document.body.focus();
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId('serviceMapControlsSearch')).toBeInTheDocument();
      expect(screen.getByTestId('serviceMapControlsSearch')).toHaveFocus();
    });
  });

  it('does not hijack Ctrl+K when focus is in an input outside the service map', async () => {
    render(
      <>
        <input data-test-subj="outsideServiceMapField" aria-label="Outside field" />
        <ReactFlowProvider>
          <ServiceMapGraph {...defaultProps} />
        </ReactFlowProvider>
      </>
    );

    const outside = screen.getByTestId('outsideServiceMapField');

    await act(async () => {
      outside.focus();
    });
    expect(outside).toHaveFocus();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    expect(outside).toHaveFocus();
    expect(screen.getByTestId('serviceMapControlsSearch')).not.toHaveFocus();
  });
});
