/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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
      <div data-testid="react-flow">{children}</div>
    ),
    Background: () => <div data-testid="react-flow-background" />,
    Controls: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="react-flow-controls">{children}</div>
    ),
    ControlButton: ({
      children,
      onClick,
      'data-test-subj': dataTestSubj,
      ...rest
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      'data-test-subj'?: string;
    }) => (
      <button type="button" onClick={onClick} data-test-subj={dataTestSubj} {...rest}>
        {children}
      </button>
    ),
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

jest.mock('./layout', () => ({
  applyDagreLayout: jest.fn((nodes: unknown) => nodes),
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

describe('ServiceMapGraph - Full screen', () => {
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
});
