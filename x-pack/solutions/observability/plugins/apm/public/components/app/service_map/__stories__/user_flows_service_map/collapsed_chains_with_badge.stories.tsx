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
import { EuiCallOut, EuiFieldSearch, EuiFormLabel, EuiSpacer, EuiText } from '@elastic/eui';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../../service_map_edge';
import { DependencyNode } from '../../dependency_node';
import { applyDagreLayout } from '../../layout';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../../common/service_map';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../../common/service_map/constants';
import { ServiceNodeWithCollapseBadge } from './service_node_with_collapse_badge';

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

/**
 * For each "anchor" service (end of visible chain), the list of node IDs that are
 * hidden when collapsed. Clicking +N on the badge expands these; -N collapses them.
 */
const COLLAPSIBLE_DOWNSTREAM: Record<string, string[]> = {
  'payment-service': ['payment-db', 'notification-svc', 'audit-svc'],
  'order-service': ['order-db', 'inventory-svc', 'inventory-db', 'stock-svc'],
  'user-service': ['user-db', 'cache'],
};

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
  // Payment downstream (collapsed by default)
  {
    id: 'payment-db',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'payment-db',
      label: 'payment-db',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  },
  {
    id: 'notification-svc',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'notification-svc',
      label: 'notification-svc',
      isService: true,
      agentName: 'nodejs',
    },
  },
  {
    id: 'audit-svc',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'audit-svc',
      label: 'audit-svc',
      isService: true,
      agentName: 'java',
    },
  },
  // Order downstream (collapsed by default)
  {
    id: 'order-db',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'order-db',
      label: 'order-db',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  },
  {
    id: 'inventory-svc',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'inventory-svc',
      label: 'inventory-svc',
      isService: true,
      agentName: 'python',
    },
  },
  // Inventory downstream (connected expandable: order-service → inventory-svc → these)
  {
    id: 'inventory-db',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'inventory-db',
      label: 'inventory-db',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  },
  {
    id: 'stock-svc',
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: 'stock-svc',
      label: 'stock-svc',
      isService: true,
      agentName: 'go',
    },
  },
  // User downstream (collapsed by default)
  {
    id: 'user-db',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'user-db',
      label: 'user-db',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  },
  {
    id: 'cache',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'cache',
      label: 'cache',
      isService: false,
      spanType: 'cache',
      spanSubtype: 'redis',
    },
  },
];

const BASE_EDGES: ServiceMapEdge[] = [
  {
    id: 'frontend-app~api-gateway',
    source: 'frontend-app',
    target: 'api-gateway',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'api-gateway~payment-service',
    source: 'api-gateway',
    target: 'payment-service',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'api-gateway~order-service',
    source: 'api-gateway',
    target: 'order-service',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'api-gateway~user-service',
    source: 'api-gateway',
    target: 'user-service',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'payment-service~payment-db',
    source: 'payment-service',
    target: 'payment-db',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'payment-service~notification-svc',
    source: 'payment-service',
    target: 'notification-svc',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'payment-service~audit-svc',
    source: 'payment-service',
    target: 'audit-svc',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'order-service~order-db',
    source: 'order-service',
    target: 'order-db',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'order-service~inventory-svc',
    source: 'order-service',
    target: 'inventory-svc',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'inventory-svc~inventory-db',
    source: 'inventory-svc',
    target: 'inventory-db',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'inventory-svc~stock-svc',
    source: 'inventory-svc',
    target: 'stock-svc',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'user-service~user-db',
    source: 'user-service',
    target: 'user-db',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
  {
    id: 'user-service~cache',
    source: 'user-service',
    target: 'cache',
    data: { isBidirectional: false },
    ...createDefaultEdgeStyle(),
  },
];

const nodeTypes: NodeTypes = {
  service: ServiceNodeWithCollapseBadge,
  dependency: DependencyNode,
};

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Collapsible groups/Collapsed chains with badge',
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
          'Service map with **collapsed** downstream: only the first two tiers are visible by default. ' +
          'End services (payments, orders, user-service) show a light blue **+N** badge for collapsed connections. ' +
          'Click the badge to **expand** (show dependencies); the badge becomes **−N**. Click again to **collapse**.',
      },
    },
  },
};

export default meta;

function getVisibleNodeIds(expandedAnchors: Set<string>): Set<string> {
  const hidden = new Set<string>();
  for (const [anchor, ids] of Object.entries(COLLAPSIBLE_DOWNSTREAM)) {
    if (!expandedAnchors.has(anchor)) {
      ids.forEach((id) => hidden.add(id));
    }
  }
  const visible = new Set(BASE_NODES.map((n) => n.id).filter((id) => !hidden.has(id)));
  return visible;
}

export const CollapsedChainsWithBadge: StoryFn = () => {
  const [expandedAnchors, setExpandedAnchors] = useState<Set<string>>(new Set(['api-gateway']));

  const toggleExpand = useCallback((anchorId: string) => {
    setExpandedAnchors((prev) => {
      const next = new Set(prev);
      if (next.has(anchorId)) {
        next.delete(anchorId);
      } else {
        next.add(anchorId);
      }
      return next;
    });
  }, []);

  const visibleNodeIds = useMemo(() => getVisibleNodeIds(expandedAnchors), [expandedAnchors]);

  /** Kuery filter driven by +/- badges: expanded anchors become OR service.name: "id" */
  const searchBarKuery = useMemo(
    () =>
      expandedAnchors.size === 0
        ? ''
        : Array.from(expandedAnchors)
            .map((id) => `service.name: "${id}"`)
            .join(' OR '),
    [expandedAnchors]
  );

  const visibleNodes = useMemo(() => {
    return BASE_NODES.filter((n) => visibleNodeIds.has(n.id)).map((node) => {
      if (node.type !== 'service' || !node.data) return node;
      const anchorId = node.data.id as string;
      const collapsedIds = COLLAPSIBLE_DOWNSTREAM[anchorId];
      if (!collapsedIds) return node;
      const count = collapsedIds.length;
      return {
        ...node,
        data: {
          ...node.data,
          collapsedCount: count,
          isExpanded: expandedAnchors.has(anchorId),
          onBadgeClick: toggleExpand,
        },
      };
    });
  }, [visibleNodeIds, expandedAnchors, toggleExpand]);

  const visibleEdges = useMemo(
    () => BASE_EDGES.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [visibleNodeIds]
  );

  const layoutedNodes = useMemo(
    () => applyDagreLayout(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(visibleEdges);
  }, [layoutedNodes, visibleEdges, setNodes, setEdges]);

  return (
    <div style={{ padding: 16 }}>
      <EuiCallOut size="s" title="Collapsed chains: +N / −N badge" iconType="iInCircle">
        <p>
          Visible by default: frontend → api-gateway → payment-service, order-service, user-service.
          Each end service has a primary badge with <strong>+3</strong>, <strong>+4</strong>, or{' '}
          <strong>+2</strong> for collapsed connections (order-service includes inventory-svc and
          its dependency + service). Click <strong>+</strong> to expand (adds{' '}
          <code>OR service.name: &quot;&lt;service&gt;&quot;</code> to the search bar); click{' '}
          <strong>−</strong> to collapse (removes it).
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          Nodes: {nodes.length} | Edges: {edges.length} | Expanded anchors: {expandedAnchors.size}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFormLabel>Search (service map filter)</EuiFormLabel>
      <EuiSpacer size="xs" />
      <EuiFieldSearch
        fullWidth
        placeholder='Filter by service (e.g. service.name: "frontend-app"). Click + on a node to add; click − to remove.'
        value={searchBarKuery}
        readOnly
        aria-label="Service map Kuery filter"
        data-test-subj="serviceMapStorySearchBar"
      />
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

export const CollapsedChainsWithBadgeDefault: StoryObj = {
  render: () => <CollapsedChainsWithBadge />,
};
