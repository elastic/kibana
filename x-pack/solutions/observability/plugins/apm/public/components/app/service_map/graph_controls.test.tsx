/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('./use_keyboard_navigation', () => {
  const mocked = {
    useKeyboardNavigation: vi.fn(() => ({
      screenReaderAnnouncement: '',
      setScreenReaderAnnouncement: vi.fn(),
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
      <div data-test-subj="react-flow">{children}</div>
    ),
    Background: () => <div data-test-subj="react-flow-background" />,
    Panel: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapOptionsPanelHost">{children}</div>
    ),
    Controls: ({ children }: { children?: React.ReactNode }) => (
      <div data-test-subj="serviceMapControls">{children}</div>
    ),
    useNodesState: vi.fn((initialNodes: unknown) => [initialNodes, vi.fn()]),
    useEdgesState: vi.fn((initialEdges: unknown) => [initialEdges, vi.fn()]),
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
      applyEdgeHighlighting: vi.fn((edges: unknown) => edges),
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
      getAnimationDuration: vi.fn((duration: number) => duration),
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
    applyDagreLayout: vi.fn((nodes: unknown) => nodes),
    applyServiceMapLayout: vi.fn((nodes: unknown) => nodes),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./service_map_minimap', () => {
  const mocked = {
    ServiceMapMinimap: () => <div data-testid="react-flow-minimap" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./service_map_diagnostic_button', () => {
  const mocked = {
    ServiceMapDiagnosticButton: () => <div data-test-subj="serviceMapDiagnosticButton" />,
  };
  return { ...mocked, default: mocked };
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

const expectButtonTooltip = async (button: HTMLElement, content: string) => {
  expect(button).toHaveAccessibleName(content);
  expect(button).not.toHaveAttribute('title');

  const tooltipAnchor = button.closest('.euiToolTipAnchor') ?? button;
  fireEvent.mouseEnter(tooltipAnchor);
  fireEvent.mouseOver(tooltipAnchor);

  await waitFor(() => {
    expect(screen.getByRole('tooltip')).toHaveTextContent(content);
  });

  fireEvent.mouseLeave(tooltipAnchor);
  fireEvent.mouseOut(tooltipAnchor);
};

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
    await expectButtonTooltip(fullscreenButton, 'Enter fullscreen');

    await act(async () => {
      fullscreenButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('serviceMapFullScreenButton')).toHaveAccessibleName(
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
    await expectButtonTooltip(fullscreenButton, 'Exit fullscreen (esc)');

    await act(async () => {
      fullscreenButton.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('serviceMapFullScreenButton')).toHaveAccessibleName(
        'Enter fullscreen'
      );
    });
  });

  it('renders "View in Service map" button when fullMapHref is provided', async () => {
    const fullMapHref = '/app/apm/service-map?rangeFrom=now-24h&rangeTo=now';
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} fullMapHref={fullMapHref} />
      </ReactFlowProvider>
    );

    const viewFullMapButton = screen.getByTestId('serviceMapViewFullMapButton');
    expect(viewFullMapButton).toBeInTheDocument();
    expect(viewFullMapButton).toHaveAttribute('href', fullMapHref);
    await expectButtonTooltip(viewFullMapButton, 'View in Service map');
  });

  it('does not render "View in Service map" button when fullMapHref is not provided', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    expect(screen.queryByTestId('serviceMapViewFullMapButton')).not.toBeInTheDocument();
  });

  it('renders both view in Service map and fullscreen buttons when both fullMapHref and onToggleFullscreen are provided', () => {
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

  it('renders the diagnostic button as part of the graph with no pre-selected service', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );
    expect(screen.getByTestId('serviceMapDiagnosticButton')).toBeInTheDocument();
  });
});
