/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EuiText, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceNode } from '../service_node';
import { DependencyNode } from '../dependency_node';
import { ServiceMapEdge } from '../service_map_edge';
import { applyDagreLayout } from '../layout';
import type {
  ServiceMapNode,
  ServiceMapEdge as ServiceMapEdgeType,
} from '../../../../../common/service_map';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../common/service_map/constants';

const nodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
};

const edgeTypes = {
  default: ServiceMapEdge,
};

const meta: Meta = {
  title: 'app/ServiceMap/Edges',
  decorators: [
    (Story) => (
      <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now">
        <ReactFlowProvider>
          <Story />
        </ReactFlowProvider>
      </MockApmPluginStorybook>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export default meta;

function createEdgeStyle(
  color: string = DEFAULT_EDGE_COLOR,
  strokeWidth: number = DEFAULT_EDGE_STROKE_WIDTH
) {
  return {
    type: 'default' as const,
    style: {
      stroke: color,
      strokeWidth,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color,
    },
  };
}

function createHighlightedEdgeStyle(color: string = '#0077CC') {
  return {
    type: 'default' as const,
    style: {
      stroke: color,
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE + 2,
      height: DEFAULT_MARKER_SIZE + 2,
      color,
    },
  };
}

export const BasicEdge: StoryObj = {
  render: () => {
    const nodes: ServiceMapNode[] = [
      {
        id: 'service-a',
        type: 'service',
        position: { x: 0, y: 100 },
        data: { id: 'service-a', label: 'service-a', isService: true, agentName: 'java' },
      },
      {
        id: 'service-b',
        type: 'service',
        position: { x: 300, y: 100 },
        data: { id: 'service-b', label: 'service-b', isService: true, agentName: 'nodejs' },
      },
    ];

    const edges: ServiceMapEdgeType[] = [
      {
        id: 'service-a~service-b',
        source: 'service-a',
        target: 'service-b',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      } as ServiceMapEdgeType,
    ];

    return (
      <div style={{ height: 300, width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
    );
  },
};

export const BidirectionalEdge: StoryObj = {
  render: () => {
    const nodes: ServiceMapNode[] = [
      {
        id: 'service-a',
        type: 'service',
        position: { x: 0, y: 100 },
        data: { id: 'service-a', label: 'service-a', isService: true, agentName: 'java' },
      },
      {
        id: 'service-b',
        type: 'service',
        position: { x: 300, y: 100 },
        data: { id: 'service-b', label: 'service-b', isService: true, agentName: 'python' },
      },
    ];

    const edges: ServiceMapEdgeType[] = [
      {
        id: 'service-a~service-b',
        source: 'service-a',
        target: 'service-b',
        data: { isBidirectional: true },
        ...createEdgeStyle(),
        markerStart: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: '#c8c8c8',
        },
      } as ServiceMapEdgeType,
    ];

    return (
      <div style={{ height: 300, width: '100%' }}>
        <EuiCallOut
          size="s"
          title="Bidirectional edge: arrows on both ends indicate two-way communication"
          iconType="sortable"
        />
        <EuiSpacer size="s" />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
    );
  },
};

export const EdgeHighlighting: StoryObj = {
  render: () => {
    const initialNodes: ServiceMapNode[] = [
      {
        id: 'frontend',
        type: 'service',
        position: { x: 0, y: 0 },
        data: { id: 'frontend', label: 'frontend', isService: true, agentName: 'rum-js' },
      },
      {
        id: 'api-gateway',
        type: 'service',
        position: { x: 0, y: 0 },
        data: { id: 'api-gateway', label: 'api-gateway', isService: true, agentName: 'nodejs' },
      },
      {
        id: 'user-service',
        type: 'service',
        position: { x: 0, y: 0 },
        data: { id: 'user-service', label: 'user-service', isService: true, agentName: 'java' },
      },
      {
        id: 'order-service',
        type: 'service',
        position: { x: 0, y: 0 },
        data: { id: 'order-service', label: 'order-service', isService: true, agentName: 'python' },
      },
      {
        id: '>postgresql',
        type: 'dependency',
        position: { x: 0, y: 0 },
        data: {
          id: '>postgresql',
          label: 'postgresql',
          isService: false,
          spanType: 'db',
          spanSubtype: 'postgresql',
        },
      },
    ];

    const initialEdges: ServiceMapEdgeType[] = [
      {
        id: 'frontend~api-gateway',
        source: 'frontend',
        target: 'api-gateway',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
      {
        id: 'api-gateway~user-service',
        source: 'api-gateway',
        target: 'user-service',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
      {
        id: 'api-gateway~order-service',
        source: 'api-gateway',
        target: 'order-service',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
      {
        id: 'user-service~>postgresql',
        source: 'user-service',
        target: '>postgresql',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
      {
        id: 'order-service~>postgresql',
        source: 'order-service',
        target: '>postgresql',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
    ] as ServiceMapEdgeType[];

    const layoutedNodes = applyDagreLayout(initialNodes, initialEdges);

    const InteractiveGraph = () => {
      const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
      const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
      const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

      const handleNodeClick = useCallback(
        (_: React.MouseEvent, node: ServiceMapNode) => {
          const newSelectedId = selectedNodeId === node.id ? null : node.id;
          setSelectedNodeId(newSelectedId);

          setEdges((currentEdges) =>
            currentEdges.map((edge) => {
              const isConnected =
                newSelectedId !== null &&
                (edge.source === newSelectedId || edge.target === newSelectedId);
              return {
                ...edge,
                ...(isConnected ? createHighlightedEdgeStyle() : createEdgeStyle()),
                zIndex: isConnected ? 10 : 0,
              };
            })
          );
        },
        [selectedNodeId, setEdges]
      );

      const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setEdges((currentEdges) =>
          currentEdges.map((edge) => ({
            ...edge,
            ...createEdgeStyle(),
            zIndex: 0,
          }))
        );
      }, [setEdges]);

      return (
        <div style={{ height: 400, width: '100%' }}>
          <EuiCallOut
            size="s"
            title="Click a node to highlight its connected edges"
            iconType="crosshairs"
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {selectedNodeId ? `Selected: ${selectedNodeId}` : 'No node selected'}
          </EuiText>
          <EuiSpacer size="s" />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      );
    };

    return <InteractiveGraph />;
  },
};

export const EdgeToDependency: StoryObj = {
  render: () => {
    const nodes: ServiceMapNode[] = [
      {
        id: 'backend',
        type: 'service',
        position: { x: 0, y: 100 },
        data: { id: 'backend', label: 'backend', isService: true, agentName: 'java' },
      },
      {
        id: '>postgresql',
        type: 'dependency',
        position: { x: 300, y: 100 },
        data: {
          id: '>postgresql',
          label: 'postgresql',
          isService: false,
          spanType: 'db',
          spanSubtype: 'postgresql',
        },
      },
    ];

    const edges: ServiceMapEdgeType[] = [
      {
        id: 'backend~>postgresql',
        source: 'backend',
        target: '>postgresql',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      } as ServiceMapEdgeType,
    ];

    return (
      <div style={{ height: 300, width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
    );
  },
};

export const MultipleEdges: StoryObj = {
  render: () => {
    const nodes: ServiceMapNode[] = [
      {
        id: 'api-gateway',
        type: 'service',
        position: { x: 0, y: 150 },
        data: { id: 'api-gateway', label: 'api-gateway', isService: true, agentName: 'nodejs' },
      },
      {
        id: 'user-service',
        type: 'service',
        position: { x: 300, y: 0 },
        data: { id: 'user-service', label: 'user-service', isService: true, agentName: 'java' },
      },
      {
        id: 'order-service',
        type: 'service',
        position: { x: 300, y: 150 },
        data: { id: 'order-service', label: 'order-service', isService: true, agentName: 'python' },
      },
      {
        id: 'payment-service',
        type: 'service',
        position: { x: 300, y: 300 },
        data: { id: 'payment-service', label: 'payment-service', isService: true, agentName: 'go' },
      },
    ];

    const edges: ServiceMapEdgeType[] = [
      {
        id: 'api-gateway~user-service',
        source: 'api-gateway',
        target: 'user-service',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
      {
        id: 'api-gateway~order-service',
        source: 'api-gateway',
        target: 'order-service',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
      {
        id: 'api-gateway~payment-service',
        source: 'api-gateway',
        target: 'payment-service',
        data: { isBidirectional: false },
        ...createEdgeStyle(),
      },
    ] as ServiceMapEdgeType[];

    return (
      <div style={{ height: 400, width: '100%' }}>
        <EuiCallOut
          size="s"
          title="Multiple edges from a single service to downstream services"
          iconType="branch"
        />
        <EuiSpacer size="s" />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
    );
  },
};

export const EdgeColorVariations: StoryObj = {
  render: () => {
    const nodes: ServiceMapNode[] = [
      {
        id: 'source-1',
        type: 'service',
        position: { x: 0, y: 0 },
        data: { id: 'source-1', label: 'default-edge', isService: true, agentName: 'java' },
      },
      {
        id: 'target-1',
        type: 'service',
        position: { x: 350, y: 0 },
        data: { id: 'target-1', label: 'target-1', isService: true, agentName: 'nodejs' },
      },
      {
        id: 'source-2',
        type: 'service',
        position: { x: 0, y: 100 },
        data: { id: 'source-2', label: 'highlighted-edge', isService: true, agentName: 'python' },
      },
      {
        id: 'target-2',
        type: 'service',
        position: { x: 350, y: 100 },
        data: { id: 'target-2', label: 'target-2', isService: true, agentName: 'go' },
      },
    ];

    const edges: ServiceMapEdgeType[] = [
      {
        id: 'source-1~target-1',
        source: 'source-1',
        target: 'target-1',
        data: { isBidirectional: false },
        ...createEdgeStyle('#c8c8c8', 1),
      },
      {
        id: 'source-2~target-2',
        source: 'source-2',
        target: 'target-2',
        data: { isBidirectional: false },
        ...createHighlightedEdgeStyle('#0077CC'),
      },
    ] as ServiceMapEdgeType[];

    return (
      <div style={{ height: 300, width: '100%' }}>
        <EuiCallOut
          size="s"
          title="Edge colors: default (gray) vs highlighted (blue)"
          iconType="palette"
        />
        <EuiSpacer size="s" />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
    );
  },
};
