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
import { getMinimapNodeColor } from './service_map_minimap';
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

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      docLinks: {
        links: {
          apm: {
            supportedServiceMaps:
              'https://www.elastic.co/guide/en/kibana/current/service-maps.html',
            supportedServiceMapsLegend:
              'https://www.elastic.co/guide/en/kibana/current/service-maps.html#service-maps-legend',
          },
        },
      },
    },
  }),
}));

jest.mock('./use_keyboard_navigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    screenReaderAnnouncement: '',
    setScreenReaderAnnouncement: jest.fn(),
  })),
}));

jest.mock('./use_service_map_alerts_tab_href', () =>
  jest.requireActual('./use_service_map_alerts_tab_href.test_mock')
);

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
    useNodesState: jest.fn((initialNodes: unknown) => [initialNodes, jest.fn()]),
    useEdgesState: jest.fn((initialEdges: unknown) => [initialEdges, jest.fn()]),
    useReactFlow: jest.fn(() => ({
      fitView: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      setCenter: jest.fn(),
      getNodes: jest.fn(() => []),
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
  });

  it('renders the minimap container within ReactFlow', () => {
    render(
      <ReactFlowProvider>
        <ServiceMapGraph {...defaultProps} />
      </ReactFlowProvider>
    );

    const reactFlow = screen.getByTestId('react-flow');
    const minimap = screen.getByTestId('serviceMapMinimap');
    expect(reactFlow).toContainElement(minimap);
  });

  describe('getMinimapNodeColor', () => {
    const colors = {
      mediumShade: MOCK_EUI_THEME.colors.mediumShade,
    };

    it('returns the default gray for service nodes without anomaly stats', () => {
      expect(getMinimapNodeColor(createMockServiceNode('svc-1', 'My Service'), colors)).toBe(
        MOCK_EUI_THEME.colors.mediumShade
      );
    });

    it('returns the default gray for dependency nodes', () => {
      expect(getMinimapNodeColor(createMockDependencyNode('dep-1', 'My Dependency'), colors)).toBe(
        MOCK_EUI_THEME.colors.mediumShade
      );
    });

    it('returns the default gray when service anomaly stats exist without an anomaly score', () => {
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

      expect(getMinimapNodeColor(partialStatsNode, colors)).toBe(MOCK_EUI_THEME.colors.mediumShade);
    });

    it('returns ML severity color from anomaly score when anomalyScore is present', () => {
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

      expect(getMinimapNodeColor(scoredNode, colors)).toBe(getSeverityColor(90));
    });
  });
});
