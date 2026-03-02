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
import type { Node } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
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
import { ServiceHealthStatus } from '../../../../../../common/service_health_status';
import { MapPopover } from '../../popover';
import { ServiceMapEdgeWithLabel } from './service_map_edge_with_label';
import { ServiceNodeWithAlertAndSloBadges } from './service_node_with_alert_and_slo_badges';

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

/** Mock alerts by service id (demo). */
const MOCK_ALERTS_BY_SERVICE: Record<
  string,
  Array<{ id: string; title: string; severity: string; time: string }>
> = {
  'payment-service': [
    { id: '1', title: 'High error rate', severity: 'critical', time: '2024-01-15T10:32:00Z' },
    {
      id: '2',
      title: 'Latency threshold exceeded',
      severity: 'warning',
      time: '2024-01-15T10:28:00Z',
    },
    { id: '3', title: 'Connection timeouts', severity: 'critical', time: '2024-01-15T10:25:00Z' },
    {
      id: '4',
      title: 'Database pool exhausted',
      severity: 'critical',
      time: '2024-01-15T10:20:00Z',
    },
    { id: '5', title: 'Elevated 5xx rate', severity: 'warning', time: '2024-01-15T10:15:00Z' },
  ],
  'order-service': [
    { id: '6', title: 'Downstream timeout', severity: 'critical', time: '2024-01-15T10:30:00Z' },
    { id: '7', title: 'High memory', severity: 'warning', time: '2024-01-15T10:28:00Z' },
    { id: '8', title: 'Slow queries', severity: 'warning', time: '2024-01-15T10:26:00Z' },
  ],
  'inventory-service': [
    {
      id: '9',
      title: 'DB connection failures',
      severity: 'critical',
      time: '2024-01-15T10:29:00Z',
    },
    { id: '10', title: 'Cache miss spike', severity: 'warning', time: '2024-01-15T10:27:00Z' },
  ],
  'api-gateway': [
    { id: '12', title: 'Rate limit exceeded', severity: 'critical', time: '2024-01-15T10:30:00Z' },
    { id: '13', title: 'Upstream 502', severity: 'critical', time: '2024-01-15T10:28:00Z' },
    { id: '14', title: 'Certificate expiry', severity: 'warning', time: '2024-01-15T10:25:00Z' },
    { id: '15', title: 'High CPU', severity: 'warning', time: '2024-01-15T10:22:00Z' },
  ],
  'frontend-app': [
    { id: '16', title: 'CDN errors', severity: 'warning', time: '2024-01-15T10:29:00Z' },
    { id: '17', title: 'API latency', severity: 'warning', time: '2024-01-15T10:27:00Z' },
  ],
  'search-service': [
    { id: '19', title: 'Index lag', severity: 'critical', time: '2024-01-15T10:30:00Z' },
    { id: '20', title: 'Query timeout', severity: 'warning', time: '2024-01-15T10:28:00Z' },
    { id: '21', title: 'Cluster yellow', severity: 'warning', time: '2024-01-15T10:25:00Z' },
  ],
  'analytics-service': [
    { id: '22', title: 'Pipeline delay', severity: 'warning', time: '2024-01-15T10:29:00Z' },
    { id: '23', title: 'Schema mismatch', severity: 'warning', time: '2024-01-15T10:27:00Z' },
  ],
};

/** Mock failed requests per edge on the problem path (demo). */
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
    {
      time: '2024-01-15T10:29:55Z',
      errorMessage: 'Connection pool exhausted',
      requestId: 'req-c1',
    },
    { time: '2024-01-15T10:27:00Z', errorMessage: 'Deadlock detected', requestId: 'req-c2' },
  ],
};

const PROBLEM_PATH_SERVICE_ANOMALY = {
  serviceAnomalyStats: { healthStatus: ServiceHealthStatus.critical },
};

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  serviceWithAlertAndSlo: ServiceNodeWithAlertAndSloBadges,
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

function createProblemEdgeStyle(
  failedCount: number,
  isDependencyEdge: boolean = false,
  showLabel: boolean = true
) {
  const noun = isDependencyEdge ? 'connection' : 'request';
  const label =
    showLabel && failedCount > 0
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

/** Services with alert and/or SLO badges: 10+ services, some on red path, some not. */
const BASE_NODES: Node[] = [
  {
    id: 'payment-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'payment-service',
      label: 'payment-service',
      isService: true,
      agentName: 'go',
      alertCount: 5,
      sloCount: 2,
    },
  },
  {
    id: 'order-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'order-service',
      label: 'order-service',
      isService: true,
      agentName: 'python',
      alertCount: 3,
      sloCount: 1,
    },
  },
  {
    id: 'inventory-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'inventory-service',
      label: 'inventory-service',
      isService: true,
      agentName: 'java',
      alertCount: 2,
      sloCount: 1,
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
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'user-service',
      label: 'user-service',
      isService: true,
      agentName: 'nodejs',
      alertCount: 0,
      sloCount: 0,
    },
  },
  {
    id: 'api-gateway',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'api-gateway',
      label: 'api-gateway',
      isService: true,
      agentName: 'dotnet',
      alertCount: 4,
      sloCount: 2,
    },
  },
  {
    id: 'frontend-app',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'frontend-app',
      label: 'frontend-app',
      isService: true,
      agentName: 'rum-js',
      alertCount: 2,
      sloCount: 4,
    },
  },
  {
    id: 'auth-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'auth-service',
      label: 'auth-service',
      isService: true,
      agentName: 'go',
      sloCount: 2,
    },
  },
  {
    id: 'recommendation-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'recommendation-service',
      label: 'recommendation-service',
      isService: true,
      agentName: 'python',
      alertCount: 0,
      sloCount: 1,
    },
  },
  {
    id: 'search-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'search-service',
      label: 'search-service',
      isService: true,
      agentName: 'java',
      alertCount: 3,
      sloCount: 2,
    },
  },
  {
    id: 'notification-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'notification-service',
      label: 'notification-service',
      isService: true,
      agentName: 'nodejs',
      sloCount: 3,
    },
  },
  {
    id: 'analytics-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'analytics-service',
      label: 'analytics-service',
      isService: true,
      agentName: 'python',
      alertCount: 2,
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
  {
    id: 'elasticsearch',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'elasticsearch',
      label: 'elasticsearch',
      isService: false,
      spanType: 'db',
      spanSubtype: 'elasticsearch',
    },
  },
];

const BASE_EDGES: Edge[] = [
  {
    id: 'payment-service~order-service',
    source: 'payment-service',
    target: 'order-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'order-service~inventory-service',
    source: 'order-service',
    target: 'inventory-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'inventory-service~postgresql',
    source: 'inventory-service',
    target: 'postgresql',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'payment-service~user-service',
    source: 'payment-service',
    target: 'user-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'payment-service~api-gateway',
    source: 'payment-service',
    target: 'api-gateway',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'api-gateway~frontend-app',
    source: 'api-gateway',
    target: 'frontend-app',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'api-gateway~auth-service',
    source: 'api-gateway',
    target: 'auth-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'user-service~recommendation-service',
    source: 'user-service',
    target: 'recommendation-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'user-service~redis',
    source: 'user-service',
    target: 'redis',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'frontend-app~search-service',
    source: 'frontend-app',
    target: 'search-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'search-service~elasticsearch',
    source: 'search-service',
    target: 'elasticsearch',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'order-service~notification-service',
    source: 'order-service',
    target: 'notification-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'inventory-service~analytics-service',
    source: 'inventory-service',
    target: 'analytics-service',
    data: {},
    ...createDefaultEdgeStyle(),
  },
];

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Alerts and SLOs (many services)',
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
          'Demo: many services (10+) with alert badges (red) and SLO badges (warning). Some are on the red problem path, others are not. Use the toggle to show only the problem path.',
      },
    },
  },
};

export default meta;

/** All service node ids that have at least one badge (for click-to-explore). */
const BADGE_NODE_IDS = new Set(
  BASE_NODES.filter((n) => {
    if (n.type !== 'serviceWithAlertAndSlo') return false;
    const d = n.data as { alertCount?: number; sloCount?: number };
    return (d.alertCount ?? 0) > 0 || (d.sloCount ?? 0) > 0;
  }).map((n) => n.id)
);

/** Service node ids that have active alerts (alertCount > 0). */
const NODE_IDS_WITH_ALERTS = new Set(
  BASE_NODES.filter((n) => {
    if (n.type !== 'serviceWithAlertAndSlo') return false;
    return ((n.data as { alertCount?: number }).alertCount ?? 0) > 0;
  }).map((n) => n.id)
);

/** Service node ids that have violated SLOs (sloCount > 0). */
const NODE_IDS_WITH_SLOS = new Set(
  BASE_NODES.filter((n) => {
    if (n.type !== 'serviceWithAlertAndSlo') return false;
    return ((n.data as { sloCount?: number }).sloCount ?? 0) > 0;
  }).map((n) => n.id)
);

export const AlertsAndSlosManyServices: StoryFn = () => {
  const [showOnlyRedPath, setShowOnlyRedPath] = useState(false);
  const [showOnlyWithAlerts, setShowOnlyWithAlerts] = useState(false);
  const [showOnlyWithViolatedSlos, setShowOnlyWithViolatedSlos] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [showAlertsBadges, setShowAlertsBadges] = useState(true);
  const [showSloBadges, setShowSloBadges] = useState(true);
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
        return {
          ...edge,
          ...createProblemEdgeStyle(count, isDependencyEdge, showEdgeLabels),
        } as Edge;
      }
      return edge;
    });
  }, [showEdgeLabels]);

  /** When filtering by alerts/SLOs: node ids to show (services matching filter + dependencies connected to them). */
  const visibleNodeIdsByFilter = useMemo(() => {
    if (!showOnlyWithAlerts && !showOnlyWithViolatedSlos) return null;
    const serviceIds = new Set<string>();
    if (showOnlyWithAlerts) NODE_IDS_WITH_ALERTS.forEach((id) => serviceIds.add(id));
    if (showOnlyWithViolatedSlos) NODE_IDS_WITH_SLOS.forEach((id) => serviceIds.add(id));
    const dependencyNodeIds = new Set(
      BASE_NODES.filter((n) => n.type === 'dependency').map((n) => n.id)
    );
    const visible = new Set(serviceIds);
    BASE_EDGES.forEach((e) => {
      if (serviceIds.has(e.source) && dependencyNodeIds.has(e.target)) visible.add(e.target);
      if (serviceIds.has(e.target) && dependencyNodeIds.has(e.source)) visible.add(e.source);
    });
    return visible;
  }, [showOnlyWithAlerts, showOnlyWithViolatedSlos]);

  const filteredNodes = useMemo(() => {
    if (showOnlyRedPath) {
      return nodesWithPathStyle.filter((n) => PROBLEM_PATH_NODE_IDS.has(n.id));
    }
    if (visibleNodeIdsByFilter) {
      return nodesWithPathStyle.filter((n) => visibleNodeIdsByFilter.has(n.id));
    }
    return nodesWithPathStyle;
  }, [showOnlyRedPath, visibleNodeIdsByFilter, nodesWithPathStyle]);

  const filteredEdges = useMemo(() => {
    if (showOnlyRedPath) {
      return edgesWithPathStyle.filter((e) => PROBLEM_PATH_EDGE_IDS.has(e.id));
    }
    if (visibleNodeIdsByFilter) {
      const visible = visibleNodeIdsByFilter;
      return edgesWithPathStyle.filter((e) => visible.has(e.source) && visible.has(e.target));
    }
    return edgesWithPathStyle;
  }, [showOnlyRedPath, visibleNodeIdsByFilter, edgesWithPathStyle]);

  const nodesWithBadgeVisibility = useMemo(
    () =>
      filteredNodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as Record<string, unknown>),
          showAlertsBadge: showAlertsBadges,
          showSloBadge: showSloBadges,
        },
      })),
    [filteredNodes, showAlertsBadges, showSloBadges]
  );

  const layoutedNodes = useMemo(
    () => applyDagreLayout(nodesWithBadgeVisibility, filteredEdges),
    [nodesWithBadgeVisibility, filteredEdges]
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

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!BADGE_NODE_IDS.has(node.id) && !PROBLEM_PATH_NODE_IDS.has(node.id)) return;
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    setSelectedEdgeId(null);
  }, []);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (!PROBLEM_PATH_EDGE_IDS.has(edge.id)) return;
    setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
    setSelectedNodeId(null);
  }, []);

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

  const alertsForSelectedNode = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return MOCK_ALERTS_BY_SERVICE[selectedNodeId];
  }, [selectedNodeId]);

  return (
    <div style={{ padding: 16 }}>
      <EuiCallOut
        size="s"
        title="User flow: Many services with alert and SLO badges"
        iconType="bell"
      >
        <p>
          Red badges = alerts, warning badges = SLOs. Use filters to show only services with active
          alerts or violated SLOs, or the problem path. Toggle &quot;Show alert badges&quot; and
          &quot;Show SLO badges&quot; to show or hide badges on the map.
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
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
          <EuiSwitch
            label="Show only services with active alerts"
            checked={showOnlyWithAlerts}
            onChange={(e) => {
              setShowOnlyWithAlerts(e.target.checked);
              if (e.target.checked) {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }
            }}
            data-test-subj="showOnlyWithAlertsSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Show only services with violated SLOs"
            checked={showOnlyWithViolatedSlos}
            onChange={(e) => {
              setShowOnlyWithViolatedSlos(e.target.checked);
              if (e.target.checked) {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }
            }}
            data-test-subj="showOnlyWithViolatedSlosSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Show edge labels"
            checked={showEdgeLabels}
            onChange={(e) => setShowEdgeLabels(e.target.checked)}
            data-test-subj="showEdgeLabelsSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Show alert badges"
            checked={showAlertsBadges}
            onChange={(e) => setShowAlertsBadges(e.target.checked)}
            data-test-subj="showAlertsBadgesSwitch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Show SLO badges"
            checked={showSloBadges}
            onChange={(e) => setShowSloBadges(e.target.checked)}
            data-test-subj="showSloBadgesSwitch"
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
          <p>
            Click a service (with alerts or SLOs) or a red edge to explore. Alerts and failed
            requests are shown in the popover where available.
          </p>
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
            alerts={alertsForSelectedNode}
            failedRequestsByEdge={MOCK_FAILED_REQUESTS}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export const AlertsAndSlosManyServicesDefault: StoryObj = {
  render: () => <AlertsAndSlosManyServices />,
};
