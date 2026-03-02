/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import type { NodeTypes } from '@xyflow/react';
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
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceNode } from '../../service_node';
import { DependencyNode } from '../../dependency_node';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../../service_map_edge';
import { applyDagreLayout } from '../../layout';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../../common/service_map';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../../common/service_map/constants';
import { GroupedServiceNode } from './grouped_service_node';
import {
  applyExpandedServiceGroups,
  type ServiceGroupDefinition,
  type GroupedServiceMapNode,
} from './expand_collapse_helpers';

function getHeight() {
  return window.innerHeight - 180;
}

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

/** Fixed, fully connected map: Frontend tier → Backend tier → dependency */
const FRONTEND_SERVICE_IDS = ['frontend-app', 'api-gateway', 'auth-service'];
const BACKEND_SERVICE_IDS = ['user-service', 'order-service', 'payment-service'];

const SERVICE_GROUPS: ServiceGroupDefinition[] = [
  { id: 'group-frontend', label: 'Frontend', serviceIds: FRONTEND_SERVICE_IDS },
  { id: 'group-backend', label: 'Backend', serviceIds: BACKEND_SERVICE_IDS },
];

const BASE_NODES: ServiceMapNode[] = [
  {
    id: 'frontend-app',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'frontend-app',
      label: 'frontend-app',
      isService: true,
      agentName: 'rum-js',
    },
  },
  {
    id: 'api-gateway',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'api-gateway',
      label: 'api-gateway',
      isService: true,
      agentName: 'nodejs',
    },
  },
  {
    id: 'auth-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'auth-service',
      label: 'auth-service',
      isService: true,
      agentName: 'java',
    },
  },
  {
    id: 'user-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'user-service',
      label: 'user-service',
      isService: true,
      agentName: 'go',
    },
  },
  {
    id: 'order-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'order-service',
      label: 'order-service',
      isService: true,
      agentName: 'python',
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
      agentName: 'dotnet',
    },
  },
  {
    id: 'postgresql',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'postgresql',
      label: 'postgresql',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  },
];

const BASE_EDGES: ServiceMapEdge[] = [
  { id: 'frontend-app~api-gateway', source: 'frontend-app', target: 'api-gateway', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
  { id: 'api-gateway~auth-service', source: 'api-gateway', target: 'auth-service', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
  { id: 'api-gateway~user-service', source: 'api-gateway', target: 'user-service', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
  { id: 'auth-service~user-service', source: 'auth-service', target: 'user-service', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
  { id: 'user-service~order-service', source: 'user-service', target: 'order-service', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
  { id: 'order-service~payment-service', source: 'order-service', target: 'payment-service', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
  { id: 'payment-service~postgresql', source: 'payment-service', target: 'postgresql', data: { isBidirectional: false }, ...createDefaultEdgeStyle() },
];

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  groupedService: GroupedServiceNode,
};

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Collapsible groups/Grouped service nodes',
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
          'Demo: fully connected map with **Frontend** and **Backend** service groups. All services and the dependency are connected; toggle each group to expand (show individual services) or collapse (show grouped node). Data is mocked; interactions are live.',
      },
    },
  },
};

export default meta;

export const GroupedServiceNodes: StoryFn = () => {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () =>
      applyExpandedServiceGroups(
        BASE_NODES,
        BASE_EDGES,
        SERVICE_GROUPS,
        expandedGroupIds
      ),
    [expandedGroupIds]
  );

  const layoutedNodes = useMemo(
    () => applyDagreLayout(rawNodes as Array<ServiceMapNode | GroupedServiceMapNode>, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(rawEdges);
  }, [layoutedNodes, rawEdges, setNodes, setEdges]);

  return (
    <div style={{ padding: 16 }}>
      <EuiCallOut size="s" title="User flow: Grouped service nodes (Frontend / Backend)" iconType="folderOpen">
        <p>
          Fully connected map: Frontend (frontend-app → api-gateway → auth-service) and Backend
          (user-service → order-service → payment-service → postgresql). Toggle groups below to
          expand or collapse. Data is mocked.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" wrap gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFormLabel>Expand group:</EuiFormLabel>
        </EuiFlexItem>
        {SERVICE_GROUPS.map((group) => (
          <EuiFlexItem key={group.id} grow={false}>
            <EuiSwitch
              label={group.label}
              checked={expandedGroupIds.has(group.id)}
              onChange={() => toggleGroup(group.id)}
              data-test-subj={`expandGroup-${group.id}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Nodes: {nodes.length} | Edges: {edges.length}
          {` | Expanded: ${SERVICE_GROUPS.filter((g) => expandedGroupIds.has(g.id)).length}/${SERVICE_GROUPS.length} groups`}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <div style={{ height: getHeight(), width: '100%' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={{ default: ServiceMapEdgeComponent }}
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
};

export const GroupedServiceNodesDefault: StoryObj = {
  render: () => <GroupedServiceNodes />,
};
