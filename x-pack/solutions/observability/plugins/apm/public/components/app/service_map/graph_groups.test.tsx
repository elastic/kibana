/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import {
  FIT_VIEW_DEFER_MS,
  MOCK_EUI_THEME_FOR_USE_THEME,
  OPENED_GROUP_MAX_ZOOM,
} from './constants';
import { ServiceMapGraph } from './graph';

const mockFitView = jest.fn();

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
            data-id={node.id}
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
      fitView: mockFitView,
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      getViewport: () => ({ x: 0, y: 0, zoom: 0.5 }),
      getNodes: () => [],
      getNodesBounds: () => ({ x: 0, y: 0, width: 0, height: 0 }),
      setCenter: jest.fn(),
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

const mockAnnounce = jest.fn();
const mockUseKeyboardNavigation = jest.fn(
  (_options: { onNodeSelect: (node: ServiceMapNode | null) => void }) => ({
    screenReaderAnnouncement: '',
    announce: mockAnnounce,
  })
);

jest.mock('./use_keyboard_navigation', () => ({
  useKeyboardNavigation: (options: { onNodeSelect: (node: ServiceMapNode | null) => void }) =>
    mockUseKeyboardNavigation(options),
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

describe('ServiceMapGraph service groups', () => {
  const closedGroup: ServiceMapNode = {
    id: 'service.namespace:shop',
    type: 'serviceGroup',
    position: { x: 0, y: 0 },
    data: {
      id: 'service.namespace:shop',
      label: 'shop',
      isService: false,
      isServiceGroup: true,
      groupKind: 'attribute',
      memberServiceIds: ['frontend', 'cart'],
      memberCount: 2,
    },
  };

  const box: ServiceMapNode = {
    id: 'service.namespace:shop',
    type: 'serviceGroupBox',
    position: { x: 0, y: 0 },
    data: {
      id: 'service.namespace:shop',
      label: 'shop',
      isService: false,
      isServiceGroupBox: true,
      groupKind: 'attribute',
      memberServiceIds: ['frontend', 'cart'],
      memberCount: 2,
    },
  };

  const groupProps = { ...defaultProps, nodes: [closedGroup], edges: [] };

  beforeEach(() => {
    mockUseKeyboardNavigation.mockClear();
  });

  const getOnNodeSelect = () => {
    const calls = mockUseKeyboardNavigation.mock.calls;
    return calls[calls.length - 1][0].onNodeSelect;
  };

  it('opens a closed group on click, without selecting it', () => {
    const onOpenGroup = jest.fn();
    render(<ServiceMapGraph {...groupProps} onOpenGroup={onOpenGroup} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-service.namespace:shop'));

    expect(onOpenGroup).toHaveBeenCalledWith('service.namespace:shop');
    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutMock')).not.toBeInTheDocument();
  });

  it('opens a closed group with Enter or Space', () => {
    const onOpenGroup = jest.fn();
    render(<ServiceMapGraph {...groupProps} onOpenGroup={onOpenGroup} />);

    act(() => getOnNodeSelect()(closedGroup));

    expect(onOpenGroup).toHaveBeenCalledWith('service.namespace:shop');
  });

  it('only selects a closed group when the map cannot open groups', () => {
    render(<ServiceMapGraph {...groupProps} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-service.namespace:shop'));

    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceFlyoutMock')).not.toBeInTheDocument();
  });

  it('does not close an open group when its box is clicked', () => {
    const onCloseGroup = jest.fn();
    render(<ServiceMapGraph {...groupProps} nodes={[box]} onCloseGroup={onCloseGroup} />);

    fireEvent.click(screen.getByTestId('serviceMapNode-service.namespace:shop'));

    expect(onCloseGroup).not.toHaveBeenCalled();
    expect(screen.queryByTestId('serviceMapPopoverMock')).not.toBeInTheDocument();
  });

  it('closes an open group with Enter or Space on its box', () => {
    const onCloseGroup = jest.fn();
    render(<ServiceMapGraph {...groupProps} nodes={[box]} onCloseGroup={onCloseGroup} />);

    act(() => getOnNodeSelect()(box));

    expect(onCloseGroup).toHaveBeenCalledWith('service.namespace:shop');
  });

  describe('screen reader instructions', () => {
    const getInstructions = () => document.getElementById('service-map-test-id')?.textContent ?? '';

    it('tells how to open and close a group when the map has a closed group', () => {
      render(<ServiceMapGraph {...groupProps} />);

      expect(getInstructions()).toContain('Press Enter or Space on a group to open it');
      expect(getInstructions()).toContain('Press Escape to close the details panel.');
    });

    it('tells how to open and close a group when the map has an open group', () => {
      render(<ServiceMapGraph {...groupProps} nodes={[box]} />);

      expect(getInstructions()).toContain('Enter or Escape on an open group to close it');
    });

    it('does not mention groups when the map has none', () => {
      render(<ServiceMapGraph {...defaultProps} />);

      expect(getInstructions()).toContain('This is an interactive service map');
      expect(getInstructions()).not.toContain('group');
    });
  });

  describe('announcing and focusing a group that opens or closes', () => {
    beforeEach(() => {
      mockAnnounce.mockClear();
    });

    it('announces a group that was opened, and moves the focus to it', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} />);
      expect(mockAnnounce).not.toHaveBeenCalled();

      rerender(<ServiceMapGraph {...groupProps} nodes={[box]} />);

      expect(mockAnnounce).toHaveBeenCalledTimes(1);
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Opened group shop. Press Enter or Escape on it to close.'
      );
      expect(screen.getByTestId('serviceMapNode-service.namespace:shop')).toHaveFocus();
    });

    it('announces a group that was closed, and moves the focus to it', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} nodes={[box]} />);
      expect(mockAnnounce).not.toHaveBeenCalled();

      rerender(<ServiceMapGraph {...groupProps} />);

      expect(mockAnnounce).toHaveBeenCalledTimes(1);
      expect(mockAnnounce).toHaveBeenCalledWith('Closed group shop.');
      expect(screen.getByTestId('serviceMapNode-service.namespace:shop')).toHaveFocus();
    });

    it('does not announce when the map changes without a group opening or closing', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} />);

      rerender(<ServiceMapGraph {...groupProps} nodes={[closedGroup, serviceNode]} />);

      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it('opens a group with a quote in its id without failing', () => {
      const quotedId = 'service.namespace:say "hi"]';
      const quoted = (type: 'serviceGroup' | 'serviceGroupBox'): ServiceMapNode =>
        ({
          ...(type === 'serviceGroup' ? closedGroup : box),
          id: quotedId,
          data: { ...(type === 'serviceGroup' ? closedGroup : box).data, id: quotedId },
        } as ServiceMapNode);
      const { rerender } = render(
        <ServiceMapGraph {...groupProps} nodes={[quoted('serviceGroup')]} />
      );

      rerender(<ServiceMapGraph {...groupProps} nodes={[quoted('serviceGroupBox')]} />);

      expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('Opened group shop'));
      expect(screen.getByTestId(`serviceMapNode-${quotedId}`)).toHaveFocus();
    });
  });

  describe('a call inside a group that closes', () => {
    const memberA: ServiceMapNode = {
      ...serviceNode,
      id: 'frontend',
      parentId: box.id,
      data: { ...serviceNode.data, id: 'frontend', label: 'frontend' },
    } as ServiceMapNode;
    const memberB: ServiceMapNode = {
      ...serviceNode,
      id: 'cart',
      parentId: box.id,
      data: { ...serviceNode.data, id: 'cart', label: 'cart' },
    } as ServiceMapNode;
    const intraGroupEdge = {
      ...serviceToDependencyEdge,
      id: 'frontend~cart',
      source: 'frontend',
      target: 'cart',
      data: {
        ...serviceToDependencyEdge.data,
        isIntraGroup: true,
        sourceData: { id: 'frontend', 'service.name': 'frontend' },
        targetData: { id: 'cart', 'service.name': 'cart' },
      },
    } as ServiceMapEdge;

    it('closes the request flyout of the call when the group closes', () => {
      const { rerender } = render(
        <ServiceMapGraph {...groupProps} nodes={[box, memberA, memberB]} edges={[intraGroupEdge]} />
      );
      fireEvent.click(screen.getByTestId('serviceMapEdge-frontend~cart'));
      expect(screen.getByTestId('requestFlyoutMock')).toBeInTheDocument();

      rerender(<ServiceMapGraph {...groupProps} nodes={[closedGroup]} edges={[]} />);

      expect(screen.queryByTestId('requestFlyoutMock')).not.toBeInTheDocument();
    });

    it('keeps the request flyout of a call that is still on the map', () => {
      const { rerender } = render(
        <ServiceMapGraph {...groupProps} nodes={[box, memberA, memberB]} edges={[intraGroupEdge]} />
      );
      fireEvent.click(screen.getByTestId('serviceMapEdge-frontend~cart'));

      rerender(
        <ServiceMapGraph
          {...groupProps}
          nodes={[box, memberA, memberB, dependencyNode]}
          edges={[intraGroupEdge]}
        />
      );

      expect(screen.getByTestId('requestFlyoutMock')).toBeInTheDocument();
    });
  });

  describe('moving the view when a group opens or closes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockFitView.mockClear();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const settle = () => act(() => jest.advanceTimersByTime(FIT_VIEW_DEFER_MS));

    it('frames the group that was opened instead of fitting the whole map', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} />);
      settle();
      mockFitView.mockClear();

      rerender(<ServiceMapGraph {...groupProps} nodes={[box]} />);
      settle();

      expect(mockFitView).toHaveBeenCalledTimes(1);
      expect(mockFitView).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [{ id: 'service.namespace:shop' }],
          maxZoom: OPENED_GROUP_MAX_ZOOM,
        })
      );
    });

    it('keeps the zoom and centres on the group that was closed', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} nodes={[box]} />);
      settle();
      mockFitView.mockClear();

      rerender(<ServiceMapGraph {...groupProps} />);
      settle();

      expect(mockFitView).toHaveBeenCalledTimes(1);
      expect(mockFitView).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [{ id: 'service.namespace:shop' }],
          minZoom: 0.5,
          maxZoom: 0.5,
        })
      );
    });

    it('still frames the group when the map changes again before the view moves', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} />);
      settle();
      mockFitView.mockClear();

      rerender(<ServiceMapGraph {...groupProps} nodes={[box]} />);
      // Before the view moved: this run cancels the first one, and must frame the group too.
      rerender(<ServiceMapGraph {...groupProps} nodes={[box, serviceNode]} />);
      settle();

      expect(mockFitView).toHaveBeenCalledTimes(1);
      expect(mockFitView).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [{ id: 'service.namespace:shop' }],
          maxZoom: OPENED_GROUP_MAX_ZOOM,
        })
      );
    });

    it('fits the whole map when the change is not a group opening or closing', () => {
      const { rerender } = render(<ServiceMapGraph {...groupProps} />);
      settle();
      mockFitView.mockClear();

      rerender(<ServiceMapGraph {...groupProps} nodes={[closedGroup, serviceNode]} />);
      settle();

      expect(mockFitView).toHaveBeenCalledTimes(1);
      expect(mockFitView).not.toHaveBeenCalledWith(
        expect.objectContaining({ nodes: expect.anything() })
      );
    });
  });
});
