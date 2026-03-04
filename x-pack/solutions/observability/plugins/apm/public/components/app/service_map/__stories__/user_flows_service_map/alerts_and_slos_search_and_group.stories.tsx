/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFormLabel,
} from '@elastic/eui';
import type { Node } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { applyDagreLayout } from '../../layout';
import { NODE_WIDTH, NODE_HEIGHT } from '../../constants';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../../common/service_map';
import { ServiceHealthStatus } from '../../../../../../common/service_health_status';
import { MapPopover } from '../../popover';
import {
  BASE_NODES,
  BASE_EDGES,
  MOCK_ALERTS_BY_SERVICE,
  MOCK_FAILED_REQUESTS,
  PROBLEM_PATH_NODE_IDS,
  PROBLEM_PATH_EDGE_IDS,
  createProblemEdgeStyle,
  nodeTypes as baseNodeTypes,
  edgeTypes,
  NODE_IDS_WITH_ALERTS,
  NODE_IDS_WITH_SLOS,
  BADGE_NODE_IDS,
} from './alerts_and_slos_shared_data';
import { SubflowGroupNode } from './subflow_group_node';

const defaultEnvironment = 'ENVIRONMENT_ALL' as const;
const defaultTimeRange = {
  start: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  end: new Date().toISOString(),
};

const DANGER_COLOR = '#BD271E';
const PROBLEM_PATH_SERVICE_ANOMALY = {
  serviceAnomalyStats: { healthStatus: ServiceHealthStatus.critical },
};
const GROUP_PADDING = 24;
const CHILD_GAP = 28;
const GROUP_COLUMNS = 2;
/** Target size for group layout so it fits the viewport; we scale the Dagre output to fit. */
const LAYOUT_TARGET_WIDTH = 1100;
const LAYOUT_TARGET_HEIGHT = 520;
const LAYOUT_MARGIN = 48;

type GroupByOption = 'none' | 'agentName' | 'transactionName';

const nodeTypes = { ...baseNodeTypes, group: SubflowGroupNode };

function getHeight() {
  return window.innerHeight - 280;
}

function getNodeLabel(node: Node): string {
  const label = (node.data as Record<string, unknown>)?.label;
  return (typeof label === 'string' ? label : node.id) ?? node.id;
}

function getGroupKey(node: Node, groupBy: GroupByOption): string {
  if (groupBy === 'none') return '';
  const d = node.data as Record<string, unknown>;
  if (groupBy === 'agentName') {
    const v = d?.agentName ?? (node.type === 'dependency' ? 'dependency' : 'unknown');
    return String(v);
  }
  if (groupBy === 'transactionName') {
    const v = d?.transactionName ?? (node.type === 'dependency' ? 'dependency' : 'unknown');
    return String(v);
  }
  return '';
}

/**
 * Build subflow layout: one parent (group) node per distinct key, with child nodes inside.
 * Positions groups using Dagre on the group-level graph (group = node, edges = connections between groups)
 * so that connected groups sit closer and edge crossings are reduced. Layout is scaled to fit the viewport.
 * See https://reactflow.dev/examples/grouping/sub-flows
 */
function buildSubflowLayout<T extends Node>(
  nodes: T[],
  edges: Edge[],
  groupBy: GroupByOption
): Node[] {
  if (groupBy === 'none' || nodes.length === 0) return nodes as Node[];
  const byKey = new Map<string, T[]>();
  const nodeIdToKey = new Map<string, string>();
  nodes.forEach((n) => {
    const key = getGroupKey(n, groupBy);
    nodeIdToKey.set(n.id, key);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(n);
  });
  const keys = Array.from(byKey.keys()).sort();
  const colWidth = NODE_WIDTH + CHILD_GAP;
  const groupWidth = GROUP_COLUMNS * colWidth - CHILD_GAP + 2 * GROUP_PADDING;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const groupEdges = new Set<string>();
  edges.forEach((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return;
    const sourceKey = nodeIdToKey.get(e.source)!;
    const targetKey = nodeIdToKey.get(e.target)!;
    if (sourceKey !== targetKey) groupEdges.add(`${sourceKey}\t${targetKey}`);
  });

  const maxGroupHeight = Math.max(
    ...keys.map((key) => {
      const children = byKey.get(key)!;
      const rows = Math.ceil(children.length / GROUP_COLUMNS);
      return rows * (NODE_HEIGHT + CHILD_GAP) - CHILD_GAP + 2 * GROUP_PADDING;
    })
  );
  const groupGap = 64;
  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'LR',
      ranksep: groupWidth + groupGap,
      nodesep: maxGroupHeight + groupGap,
      marginx: LAYOUT_MARGIN,
      marginy: LAYOUT_MARGIN,
    })
    .setDefaultEdgeLabel(() => ({}));

  keys.forEach((key) => {
    const children = byKey.get(key)!;
    const rows = Math.ceil(children.length / GROUP_COLUMNS);
    const groupHeight = rows * (NODE_HEIGHT + CHILD_GAP) - CHILD_GAP + 2 * GROUP_PADDING;
    const groupId = `group-${key.replace(/\s+/g, '-')}`;
    g.setNode(groupId, { width: groupWidth, height: groupHeight });
  });
  groupEdges.forEach((pair) => {
    const [sourceKey, targetKey] = pair.split('\t');
    const sourceId = `group-${sourceKey.replace(/\s+/g, '-')}`;
    const targetId = `group-${targetKey.replace(/\s+/g, '-')}`;
    if (g.hasNode(sourceId) && g.hasNode(targetId)) g.setEdge(sourceId, targetId);
  });

  Dagre.layout(g);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const groupPositions = new Map<string, { x: number; y: number }>();
  keys.forEach((key) => {
    const groupId = `group-${key.replace(/\s+/g, '-')}`;
    const d = g.node(groupId);
    if (!d) return;
    const width = d.width ?? groupWidth;
    const height = d.height ?? 0;
    const x = d.x - width / 2;
    const y = d.y - height / 2;
    groupPositions.set(key, { x, y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  const layoutW = maxX - minX || 1;
  const layoutH = maxY - minY || 1;
  const scaleToFit = Math.min(
    (LAYOUT_TARGET_WIDTH - 2 * LAYOUT_MARGIN) / layoutW,
    (LAYOUT_TARGET_HEIGHT - 2 * LAYOUT_MARGIN) / layoutH,
    1.2
  );
  // Never scale below 1 so group positions are never brought closer than Dagre placed them (avoids overlap)
  const scale = Math.max(1, scaleToFit);
  const offsetX = LAYOUT_MARGIN - minX * scale;
  const offsetY = LAYOUT_MARGIN - minY * scale;

  const groupNodes: Node[] = [];
  const childNodes: Node[] = [];
  keys.forEach((key, groupIndex) => {
    const children = byKey.get(key)!;
    const groupId = `group-${key.replace(/\s+/g, '-')}`;
    const rows = Math.ceil(children.length / GROUP_COLUMNS);
    const groupHeight = rows * (NODE_HEIGHT + CHILD_GAP) - CHILD_GAP + 2 * GROUP_PADDING;
    const raw = groupPositions.get(key)!;
    const x = Math.round(raw.x * scale + offsetX);
    const y = Math.round(raw.y * scale + offsetY);
    groupNodes.push({
      id: groupId,
      type: 'group',
      data: { label: key, groupIndex },
      position: { x, y },
      style: { width: groupWidth, height: groupHeight, border: 'none' },
    });
    children.forEach((node, i) => {
      const col = i % GROUP_COLUMNS;
      const row = Math.floor(i / GROUP_COLUMNS);
      childNodes.push({
        ...node,
        parentId: groupId,
        extent: 'parent',
        position: {
          x: GROUP_PADDING + col * colWidth,
          y: GROUP_PADDING + row * (NODE_HEIGHT + CHILD_GAP),
        },
      } as Node);
    });
  });
  return [...groupNodes, ...childNodes];
}

/** Focus the view on a node (center) when search match changes. Used inside ReactFlowProvider. */
function FocusOnNode({
  nodeId,
  position,
  duration = 400,
}: {
  nodeId: string | null;
  position: { x: number; y: number } | null;
  duration?: number;
}) {
  const { setCenter } = useReactFlow();
  const positionRef = useRef(position);
  positionRef.current = position;
  const prevIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!nodeId) {
      prevIdRef.current = null;
      return;
    }
    const pos = positionRef.current;
    if (!pos) return;
    if (prevIdRef.current === nodeId) return;
    prevIdRef.current = nodeId;
    setCenter(pos.x, pos.y, { duration, zoom: 1 });
  }, [nodeId, setCenter, duration]);
  return null;
}

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Alerts and SLOs (search and group by)',
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
          'Same map as Alerts and SLOs (many services) without the problem-path filter. Search by service name to focus the map on matches (like Ctrl+F). Group by agent name to show services in subflow-style groups (one box per agent).',
      },
    },
  },
};

export default meta;

const GROUP_BY_OPTIONS: Array<{ value: GroupByOption; text: string }> = [
  { value: 'none', text: 'None' },
  { value: 'agentName', text: 'Agent name' },
  { value: 'transactionName', text: 'Transaction name' },
];

export const AlertsAndSlosSearchAndGroup: StoryFn = () => {
  const [filterQuery, setFilterQuery] = useState('');
  const [goToQuery, setGoToQuery] = useState('');
  const [showOnlyWithAlerts, setShowOnlyWithAlerts] = useState(false);
  const [showOnlyWithViolatedSlos, setShowOnlyWithViolatedSlos] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [showAlertsBadges, setShowAlertsBadges] = useState(true);
  const [showSloBadges, setShowSloBadges] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const nodesWithPathStyle = useMemo(() => {
    return BASE_NODES.map((node) => {
      if (!PROBLEM_PATH_NODE_IDS.has(node.id)) return node;
      const data = node.data as Record<string, unknown>;
      if (node.type === 'dependency') {
        return { ...node, data: { ...data, borderColor: DANGER_COLOR } };
      }
      return { ...node, data: { ...data, ...PROBLEM_PATH_SERVICE_ANOMALY } };
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

  const filterQueryLower = filterQuery.trim().toLowerCase();
  const nodeIdsMatchingFilter = useMemo(() => {
    if (!filterQueryLower) return null;
    const matched = new Set<string>();
    nodesWithPathStyle.forEach((n) => {
      const label = getNodeLabel(n);
      if (label.toLowerCase().includes(filterQueryLower)) matched.add(n.id);
    });
    if (matched.size === 0) return matched;
    const withNeighbors = new Set(matched);
    BASE_EDGES.forEach((e) => {
      if (matched.has(e.source)) withNeighbors.add(e.target);
      if (matched.has(e.target)) withNeighbors.add(e.source);
    });
    return withNeighbors;
  }, [filterQueryLower, nodesWithPathStyle]);

  const filteredNodes = useMemo(() => {
    let list = nodesWithPathStyle;
    if (visibleNodeIdsByFilter) {
      list = list.filter((n) => visibleNodeIdsByFilter.has(n.id));
    }
    if (nodeIdsMatchingFilter !== null) {
      list = list.filter((n) => nodeIdsMatchingFilter.has(n.id));
    }
    return list;
  }, [nodesWithPathStyle, visibleNodeIdsByFilter, nodeIdsMatchingFilter]);

  const filteredEdges = useMemo(() => {
    const visible =
      visibleNodeIdsByFilter ?? (nodeIdsMatchingFilter ? nodeIdsMatchingFilter : null);
    if (!visible) return edgesWithPathStyle;
    return edgesWithPathStyle.filter((e) => visible.has(e.source) && visible.has(e.target));
  }, [edgesWithPathStyle, visibleNodeIdsByFilter, nodeIdsMatchingFilter]);

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

  const layoutedNodes = useMemo(() => {
    if (groupBy === 'none') {
      return applyDagreLayout(nodesWithBadgeVisibility, filteredEdges);
    }
    return buildSubflowLayout(nodesWithBadgeVisibility, filteredEdges, groupBy);
  }, [nodesWithBadgeVisibility, filteredEdges, groupBy]);

  const firstFilterMatchNodeId = useMemo(() => {
    if (!filterQueryLower || !nodeIdsMatchingFilter || nodeIdsMatchingFilter.size === 0)
      return null;
    const first = nodesWithPathStyle.find((n) => {
      const label = getNodeLabel(n);
      return label.toLowerCase().includes(filterQueryLower);
    });
    return first?.id ?? null;
  }, [filterQueryLower, nodeIdsMatchingFilter, nodesWithPathStyle]);

  const goToQueryLower = goToQuery.trim().toLowerCase();
  const goToMatchNodeId = useMemo(() => {
    if (!goToQueryLower) return null;
    const first = layoutedNodes.find((n) => {
      const label = getNodeLabel(n);
      return label.toLowerCase().includes(goToQueryLower);
    });
    return first?.id ?? null;
  }, [goToQueryLower, layoutedNodes]);

  const focusNodeId = goToQuery.trim() ? goToMatchNodeId : firstFilterMatchNodeId;
  const focusPosition = useMemo(() => {
    const nodeId = goToQuery.trim() ? goToMatchNodeId : firstFilterMatchNodeId;
    if (!nodeId) return null;
    const node = layoutedNodes.find((n) => n.id === nodeId);
    if (!node) return null;
    if (node.parentId) {
      const parent = layoutedNodes.find((n) => n.id === node.parentId);
      if (!parent) return node.position;
      return {
        x: parent.position.x + node.position.x,
        y: parent.position.y + node.position.y,
      };
    }
    return node.position;
  }, [goToQuery, goToMatchNodeId, firstFilterMatchNodeId, layoutedNodes]);

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
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, nodes]);

  const selectedEdgeForPopover = useMemo(() => {
    if (!selectedEdgeId) return null;
    return edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [selectedEdgeId, edges]);

  const alertsForSelectedNode = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return MOCK_ALERTS_BY_SERVICE[selectedNodeId];
  }, [selectedNodeId]);

  const filterNoResults =
    filterQuery.trim() !== '' && nodeIdsMatchingFilter !== null && nodeIdsMatchingFilter.size === 0;

  return (
    <div style={{ padding: 16 }}>
      <EuiCallOut size="s" title="User flow: Search and group by" iconType="search">
        <p>
          Filter by service name to show only matching services and their neighbors. Use Go to
          service to pan the map to a service without filtering. Group by Agent name to show
          services inside subflow-style boxes (one group node per agent). Other filters match the
          Alerts and SLOs (many services) story.
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
          <EuiFieldSearch
            placeholder="Filter by service name..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            isClearable
            fullWidth
            data-test-subj="filterByServiceName"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
          <EuiFieldSearch
            placeholder="Go to service..."
            value={goToQuery}
            onChange={(e) => setGoToQuery(e.target.value)}
            isClearable
            fullWidth
            data-test-subj="goToServiceName"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormLabel htmlFor="group-by-select">Group by</EuiFormLabel>
          <EuiSelect
            id="group-by-select"
            options={GROUP_BY_OPTIONS}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
            data-test-subj="groupBySelect"
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
          <EuiSwitch
            label="Show minimap"
            checked={showMinimap}
            onChange={(e) => setShowMinimap(e.target.checked)}
            data-test-subj="showMinimapSwitch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {filterNoResults && (
        <EuiText size="s" color="danger">
          No services match filter &quot;{filterQuery.trim()}&quot;
        </EuiText>
      )}
      {filterQuery.trim() !== '' && !filterNoResults && nodeIdsMatchingFilter && (
        <EuiText size="s" color="subdued">
          Showing {nodeIdsMatchingFilter.size} node(s) matching &quot;{filterQuery.trim()}&quot;
          {focusNodeId && ' (map focused on first match)'}
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
            {showMinimap && <MiniMap zoomable pannable />}
            <FocusOnNode nodeId={focusNodeId} position={focusPosition} />
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

export const AlertsAndSlosSearchAndGroupDefault: StoryObj = {
  render: () => <AlertsAndSlosSearchAndGroup />,
};
