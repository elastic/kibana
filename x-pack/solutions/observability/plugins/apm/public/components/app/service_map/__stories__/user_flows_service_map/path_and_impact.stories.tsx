/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { Edge } from '@xyflow/react';
import type { EdgeTypes } from '@xyflow/react';
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
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceNode } from '../../service_node';
import { DependencyNode } from '../../dependency_node';
import { ServiceMapEdge } from '../../service_map_edge';
import { applyDagreLayout } from '../../layout';
import type { ServiceMapNode } from '../../../../../../common/service_map';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../../common/service_map/constants';
import { ServiceMapEdgeWithLabel } from './service_map_edge_with_label';

const DANGER_COLOR = '#BD271E';

const nodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
};

const edgeTypes = {
  default: ServiceMapEdge,
  withLabel: ServiceMapEdgeWithLabel,
} as EdgeTypes;

function createDefaultEdgeStyle(color: string = DEFAULT_EDGE_COLOR) {
  return {
    type: 'default' as const,
    style: {
      stroke: color,
      strokeWidth: DEFAULT_EDGE_STROKE_WIDTH,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color,
    },
  };
}

function createPathEdgeStyle(color: string, options: { label?: string; isDashed?: boolean } = {}) {
  return {
    type: 'withLabel' as const,
    style: {
      stroke: color,
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color,
    },
    data: {
      label: options.label,
      isDanger: color === DANGER_COLOR,
      isDashed: options.isDashed ?? false,
      isBidirectional: false,
    },
  };
}

function getHeight() {
  return window.innerHeight - 180;
}

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Path and impact',
  decorators: [
    (Story) => (
      <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now">
        <Story />
      </MockApmPluginStorybook>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Demo: path in red (problem/impact path), lost connection (dashed red with label), and edges with text labels (e.g. "service-call"). Data is mocked; matches Figma concepts for triage and impact assessment.',
      },
    },
  },
};

export default meta;

const initialNodes: ServiceMapNode[] = [
  {
    id: 'ingress-node',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'ingress-node',
      label: 'ingress-node',
      isService: true,
      agentName: 'rum-js',
    },
  },
  {
    id: 'frontend-node',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'frontend-node',
      label: 'frontend-node',
      isService: true,
      agentName: 'nodejs',
    },
  },
  {
    id: 'authentication-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'authentication-service',
      label: 'authentication-service',
      isService: true,
      agentName: 'java',
    },
  },
  {
    id: 'payment-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'payment-service',
      label: 'payment-service',
      isService: true,
      agentName: 'go',
    },
  },
  {
    id: 'product-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'product-service',
      label: 'product-service',
      isService: true,
      agentName: 'python',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'ingress-node~frontend-node',
    source: 'ingress-node',
    target: 'frontend-node',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'frontend-node~authentication-service',
    source: 'frontend-node',
    target: 'authentication-service',
    ...createPathEdgeStyle(DEFAULT_EDGE_COLOR, { label: 'service-call' }),
  },
  {
    id: 'authentication-service~payment-service',
    source: 'authentication-service',
    target: 'payment-service',
    ...createPathEdgeStyle(DANGER_COLOR, { label: 'Lost connection', isDashed: true }),
  },
  {
    id: 'frontend-node~product-service',
    source: 'frontend-node',
    target: 'product-service',
    ...createPathEdgeStyle(DANGER_COLOR, { label: 'service-call' }),
  },
  {
    id: 'product-service~payment-service',
    source: 'product-service',
    target: 'payment-service',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
];

export const PathInRedAndEdgeLabels: StoryObj = {
  render: function PathInRedAndEdgeLabelsStory() {
    const layoutedNodes = useMemo(() => applyDagreLayout(initialNodes, initialEdges), []);
    const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    return (
      <div style={{ padding: 16 }}>
        <EuiCallOut
          size="s"
          title="User flow: Path in red, lost connection, edge labels"
          iconType="warning"
        >
          <p>
            Red path and dashed red edge with &quot;Lost connection&quot; show the problem/impact
            path. Edge labels (e.g. &quot;service-call&quot;) are demo-only. Data is mocked.
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <div style={{ height: getHeight(), width: '100%' }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>
    );
  },
};
