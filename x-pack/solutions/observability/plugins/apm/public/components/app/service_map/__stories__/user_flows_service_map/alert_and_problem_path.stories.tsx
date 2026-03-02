/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import type { NodeTypes } from '@xyflow/react';
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
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceNode } from '../../service_node';
import { DependencyNode } from '../../dependency_node';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../../service_map_edge';
import { applyDagreLayout } from '../../layout';
import type { Node } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../../common/service_map';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../../common/service_map/constants';
import { ServiceHealthStatus } from '../../../../../../common/service_health_status';
import { MapPopover } from '../../popover';
import { ServiceMapEdgeWithLabel } from './service_map_edge_with_label';
import { ServiceNodeWithAlertBadge } from './service_node_with_alert_badge';

const defaultEnvironment = 'ENVIRONMENT_ALL' as const;
const defaultTimeRange = {
  start: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  end: new Date().toISOString(),
};

const DANGER_COLOR = '#BD271E';

/** Node IDs and edge IDs that form the "problem" path (red border + red edges). */
const PROBLEM_PATH_NODE_IDS = new Set([
  'payment-service',
  'order-service',
  'inventory-service',
  'postgresql',
]);
const PROBLEM_PATH_EDGE_IDS = new Set([
  'payment-service~order-service',
  'order-service~inventory-service',
  'inventory-service~postgresql',
]);

/** Mock alerts for the service with alert badge (demo). */
const MOCK_ALERTS = [
  { id: '1', title: 'High error rate', severity: 'critical', time: '2024-01-15T10:32:00Z' },
  { id: '2', title: 'Latency threshold exceeded', severity: 'warning', time: '2024-01-15T10:28:00Z' },
  { id: '3', title: 'Connection timeouts to order-service', severity: 'critical', time: '2024-01-15T10:25:00Z' },
  { id: '4', title: 'Database connection pool exhausted', severity: 'critical', time: '2024-01-15T10:20:00Z' },
  { id: '5', title: 'Elevated 5xx rate', severity: 'warning', time: '2024-01-15T10:15:00Z' },
];

/** Mock failed requests per edge (demo). */
const MOCK_FAILED_REQUESTS: Record<
  string,
  Array<{ time: string; errorMessage: string; requestId: string }>
> = {
  'payment-service~order-service': [
    { time: '2024-01-15T10:31:22Z', errorMessage: 'Connection refused', requestId: 'req-a1' },
    { time: '2024-01-15T10:30:45Z', errorMessage: 'Timeout after 5000ms', requestId: 'req-a2' },
    { time: '2024-01-15T10:29:11Z', errorMessage: '503 Service Unavailable', requestId: 'req-a3' },
  ],
  'order-service~inventory-service': [
    { time: '2024-01-15T10:30:12Z', errorMessage: 'Connection reset by peer', requestId: 'req-b1' },
    { time: '2024-01-15T10:28:33Z', errorMessage: 'Timeout after 5000ms', requestId: 'req-b2' },
  ],
  'inventory-service~postgresql': [
    { time: '2024-01-15T10:29:55Z', errorMessage: 'Connection pool exhausted', requestId: 'req-c1' },
    { time: '2024-01-15T10:27:00Z', errorMessage: 'Deadlock detected', requestId: 'req-c2' },
    { time: '2024-01-15T10:25:44Z', errorMessage: 'Connection refused', requestId: 'req-c3' },
  ],
};

/** Data override so ServiceNode renders its existing border in red (critical health). */
const PROBLEM_PATH_SERVICE_ANOMALY = {
  serviceAnomalyStats: { healthStatus: ServiceHealthStatus.critical },
};

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  serviceWithAlert: ServiceNodeWithAlertBadge,
};

const edgeTypes: EdgeTypes = {
  default: ServiceMapEdgeComponent,
  withLabel: ServiceMapEdgeWithLabel,
};

function getHeight() {
  return window.innerHeight - 220;
}

function createDefaultEdgeStyle(color: string = DEFAULT_EDGE_COLOR) {
  return {
    type: 'default' as const,
    style: { stroke: color, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color,
    },
  };
}

function createProblemEdgeStyle(failedCount: number, isDependencyEdge: boolean = false) {
  const noun = isDependencyEdge ? 'connection' : 'request';
  const label =
    failedCount > 0
      ? `${failedCount} failed ${noun}${failedCount === 1 ? '' : 's'}`
      : '';
  return {
    type: 'withLabel' as const,
    style: { stroke: DANGER_COLOR, strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color: DANGER_COLOR,
    },
    data: {
      label,
      isDanger: true,
      isDashed: true,
      isBidirectional: false,
    },
  };
}

const BASE_NODES: Node[] = [
  {
    id: 'payment-service',
    type: 'serviceWithAlert',
    position: { x: 0, y: 0 },
    data: {
      id: 'payment-service',
      label: 'payment-service',
      isService: true,
      agentName: 'go',
      alertCount: 5,
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
    id: 'inventory-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'inventory-service',
      label: 'inventory-service',
      isService: true,
      agentName: 'java',
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
  {
    id: 'user-service',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'user-service',
      label: 'user-service',
      isService: true,
      agentName: 'nodejs',
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
      agentName: 'dotnet',
    },
  },
  {
    id: 'redis',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'redis',
      label: 'redis',
      isService: false,
      spanType: 'cache',
      spanSubtype: 'redis',
    },
  },
];

const BASE_EDGES: Edge[] = [
  { id: 'payment-service~order-service', source: 'payment-service', target: 'order-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'order-service~inventory-service', source: 'order-service', target: 'inventory-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'inventory-service~postgresql', source: 'inventory-service', target: 'postgresql', data: {}, ...createDefaultEdgeStyle() },
  { id: 'payment-service~user-service', source: 'payment-service', target: 'user-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'payment-service~api-gateway', source: 'payment-service', target: 'api-gateway', data: {}, ...createDefaultEdgeStyle() },
  { id: 'user-service~redis', source: 'user-service', target: 'redis', data: {}, ...createDefaultEdgeStyle() },
];

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Alert and problem path',
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
          'Demo: a service with an alert badge (e.g. "5 alerts" in red). A whole path through dependencies is marked in red (borders + edges) to show the problematic path; other connections from the same service stay normal. Data is mocked.',
      },
    },
  },
};

export default meta;

export const AlertAndProblemPath: StoryFn = () => {
  const [showOnlyRedPath, setShowOnlyRedPath] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const nodesWithPathStyle = useMemo(() => {
    return BASE_NODES.map((node) => {
      if (!PROBLEM_PATH_NODE_IDS.has(node.id)) {
        return node;
      }
      const data = node.data as Record<string, unknown>;
      if (node.type === 'dependency') {
        return { ...node, data: { ...data, borderColor: DANGER_COLOR } };
      }
      return {
        ...node,
        data: { ...data, ...PROBLEM_PATH_SERVICE_ANOMALY },
      };
    });
  }, []);

  const edgesWithPathStyle = useMemo(() => {
    return BASE_EDGES.map((edge) => {
      if (PROBLEM_PATH_EDGE_IDS.has(edge.id)) {
        const count = MOCK_FAILED_REQUESTS[edge.id]?.length ?? 0;
        const isDependencyEdge = edge.target === 'postgresql';
        return { ...edge, ...createProblemEdgeStyle(count, isDependencyEdge) } as Edge;
      }
      return edge;
    });
  }, []);

  const filteredNodes = useMemo(() => {
    if (!showOnlyRedPath) return nodesWithPathStyle;
    return nodesWithPathStyle.filter((n) => PROBLEM_PATH_NODE_IDS.has(n.id));
  }, [showOnlyRedPath, nodesWithPathStyle]);

  const filteredEdges = useMemo(() => {
    if (!showOnlyRedPath) return edgesWithPathStyle;
    return edgesWithPathStyle.filter((e) => PROBLEM_PATH_EDGE_IDS.has(e.id));
  }, [showOnlyRedPath, edgesWithPathStyle]);

  const layoutedNodes = useMemo(
    () => applyDagreLayout(filteredNodes, filteredEdges),
    [filteredNodes, filteredEdges]
  );

  const nodesWithSelection = useMemo(
    () =>
      layoutedNodes.map((n) => ({
        ...n,
        selected: selectedNodeId === n.id,
      })),
    [layoutedNodes, selectedNodeId]
  );

  const edgesWithSelection = useMemo(
    () =>
      filteredEdges.map((e) => ({
        ...e,
        selected: selectedEdgeId === e.id,
      })),
    [filteredEdges, selectedEdgeId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSelection);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesWithSelection);

  useEffect(() => {
    setNodes(nodesWithSelection);
    setEdges(edgesWithSelection);
  }, [nodesWithSelection, edgesWithSelection, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!PROBLEM_PATH_NODE_IDS.has(node.id)) return;
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
      setSelectedEdgeId(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (!PROBLEM_PATH_EDGE_IDS.has(edge.id)) return;
      setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
      setSelectedNodeId(null);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const selectedNodeForPopover = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    return node ?? null;
  }, [selectedNodeId, nodes]);

  const selectedEdgeForPopover = useMemo(() => {
    if (!selectedEdgeId) return null;
    const edge = edges.find((e) => e.id === selectedEdgeId);
    return edge ?? null;
  }, [selectedEdgeId, edges]);

  return (
    <div style={{ padding: 16 }}>
      <EuiCallOut
        size="s"
        title="User flow: Service with alerts and problem path"
        iconType="warning"
      >
        <p>
          <strong>payment-service</strong> has a red &quot;5 alerts&quot; badge. Click a red node
          or edge to explore. Toggle &quot;Show only problem path&quot; to hide other connections.
          Data is mocked.
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Show only problem path"
            checked={showOnlyRedPath}
            onChange={(e) => {
              setShowOnlyRedPath(e.target.checked);
              if (e.target.checked) {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }
            }}
            data-test-subj="showOnlyRedPathSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            Red path: payment-service → order-service → inventory-service → postgresql
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {!selectedNodeId && !selectedEdgeId && (
        <EuiText size="s" color="subdued">
          <p>Click a red node or edge to explore; the same popover as the main map is used, with alerts and failed requests.</p>
        </EuiText>
      )}
      <EuiSpacer size="s" />

      <div style={{ height: getHeight(), width: '100%', position: 'relative' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
          <MapPopover
            selectedNode={selectedNodeForPopover as ServiceMapNode | null}
            selectedEdge={selectedEdgeForPopover as ServiceMapEdge | null}
            environment={defaultEnvironment}
            kuery=""
            start={defaultTimeRange.start}
            end={defaultTimeRange.end}
            onClose={handlePopoverClose}
            alerts={MOCK_ALERTS}
            failedRequestsByEdge={MOCK_FAILED_REQUESTS}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export const AlertAndProblemPathDefault: StoryObj = {
  render: () => <AlertAndProblemPath />,
};
