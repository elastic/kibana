/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  MarkerType,
} from '@xyflow/react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type cytoscape from 'cytoscape';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { getAgentIcon } from '@kbn/custom-icons';
import { getSpanIcon } from '@kbn/apm-ui-shared';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import {
  getServiceHealthStatusColor,
  ServiceHealthStatus,
} from '../../../../../common/service_health_status';

// Node data interface
interface ServiceMapNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  agentName?: string;
  spanType?: string;
  spanSubtype?: string;
  serviceAnomalyStats?: {
    healthStatus?: ServiceHealthStatus;
  };
  isService: boolean;
}

// Custom Service Node component (circular)
const ServiceNode = memo(({ data, selected }: NodeProps<Node<ServiceMapNodeData>>) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';

  const borderColor = useMemo(() => {
    if (data.serviceAnomalyStats?.healthStatus) {
      return getServiceHealthStatusColor(euiTheme, data.serviceAnomalyStats.healthStatus);
    }
    if (selected) {
      return euiTheme.colors.primary;
    }
    return euiTheme.colors.mediumShade;
  }, [data.serviceAnomalyStats?.healthStatus, selected, euiTheme]);

  const borderWidth = useMemo(() => {
    const status = data.serviceAnomalyStats?.healthStatus;
    if (status === ServiceHealthStatus.warning) return 4;
    if (status === ServiceHealthStatus.critical) return 8;
    return 4;
  }, [data.serviceAnomalyStats?.healthStatus]);

  const iconUrl = useMemo(() => {
    if (data.agentName) {
      return getAgentIcon(data.agentName, isDarkMode);
    }
    return null;
  }, [data.agentName, isDarkMode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `${borderWidth}px solid ${borderColor}`,
          background: euiTheme.colors.backgroundBasePlain,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 2px rgba(0,0,0,0.15)',
        }}
      >
        {iconUrl && (
          <img
            src={iconUrl}
            alt={data.agentName}
            style={{ width: '60%', height: '60%', objectFit: 'contain' }}
          />
        )}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: euiTheme.size.s,
          color: selected ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph,
          fontFamily: 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
          maxWidth: 200,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          backgroundColor: selected ? `${euiTheme.colors.primary}1A` : 'transparent',
          padding: `2px ${euiTheme.size.xs}`,
          borderRadius: 4,
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
});

ServiceNode.displayName = 'ServiceNode';

// Custom Dependency Node (diamond shape)
const DependencyNode = memo(({ data, selected }: NodeProps<Node<ServiceMapNodeData>>) => {
  const { euiTheme } = useEuiTheme();

  const borderColor = selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

  const iconUrl = useMemo(() => {
    if (data.spanType || data.spanSubtype) {
      return getSpanIcon(data.spanType, data.spanSubtype);
    }
    return null;
  }, [data.spanType, data.spanSubtype]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <div
        style={{
          width: 48,
          height: 48,
          transform: 'rotate(45deg)',
          border: `4px solid ${borderColor}`,
          background: euiTheme.colors.backgroundBasePlain,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 2px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ transform: 'rotate(-45deg)' }}>
          {iconUrl && (
            <img
              src={iconUrl}
              alt={data.spanSubtype || data.spanType}
              style={{ width: 20, height: 20, objectFit: 'contain' }}
            />
          )}
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: euiTheme.size.s,
          color: selected ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph,
          fontFamily: 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
          maxWidth: 200,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          backgroundColor: selected ? `${euiTheme.colors.primary}1A` : 'transparent',
          padding: `2px ${euiTheme.size.xs}`,
          borderRadius: 4,
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
});

DependencyNode.displayName = 'DependencyNode';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
};

// Transform Cytoscape elements to React Flow format
function transformElements(elements: cytoscape.ElementDefinition[]): {
  nodes: Node<ServiceMapNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<ServiceMapNodeData>[] = [];
  const edges: Edge[] = [];
  const bidirectionalPairs = new Set<string>();

  // First pass: identify bidirectional edges
  const edgeMap = new Map<string, boolean>();
  elements.forEach((el) => {
    if ('source' in (el.data || {})) {
      const edgeData = el.data as { source: string; target: string };
      const key = `${edgeData.source}->${edgeData.target}`;
      const reverseKey = `${edgeData.target}->${edgeData.source}`;
      if (edgeMap.has(reverseKey)) {
        bidirectionalPairs.add(key);
        bidirectionalPairs.add(reverseKey);
      }
      edgeMap.set(key, true);
    }
  });

  elements.forEach((el) => {
    if ('source' in (el.data || {})) {
      // It's an edge
      const edgeData = el.data as {
        source: string;
        target: string;
        id?: string;
        bidirectional?: boolean;
        isInverseEdge?: boolean;
      };

      // Skip inverse edges (they're duplicates for bidirectional display)
      if (edgeData.isInverseEdge) return;

      const edgeKey = `${edgeData.source}->${edgeData.target}`;
      const isBidirectional = edgeData.bidirectional || bidirectionalPairs.has(edgeKey);

      edges.push({
        id: edgeData.id || `${edgeData.source}-${edgeData.target}`,
        source: edgeData.source,
        target: edgeData.target,
        type: 'default',
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
        markerStart: isBidirectional
          ? { type: MarkerType.ArrowClosed, width: 15, height: 15 }
          : undefined,
        style: { stroke: '#98A2B3', strokeWidth: 1 },
      });
    } else {
      // It's a node
      const nodeData = el.data as {
        id: string;
        'service.name'?: string;
        'agent.name'?: string;
        'span.type'?: string;
        'span.subtype'?: string;
        'span.destination.service.resource'?: string;
        label?: string;
        serviceAnomalyStats?: {
          healthStatus?: ServiceHealthStatus;
        };
      };

      const isService = !!nodeData['service.name'];
      const label =
        nodeData['service.name'] ||
        nodeData.label ||
        nodeData['span.destination.service.resource'] ||
        nodeData.id;

      nodes.push({
        id: nodeData.id,
        type: isService ? 'service' : 'dependency',
        position: { x: 0, y: 0 },
        data: {
          id: nodeData.id,
          label,
          agentName: nodeData['agent.name'],
          spanType: nodeData['span.type'],
          spanSubtype: nodeData['span.subtype'],
          serviceAnomalyStats: nodeData.serviceAnomalyStats,
          isService,
        },
      });
    }
  });

  return { nodes, edges };
}

// Apply Dagre layout (left-to-right like Cytoscape version)
function applyLayout(
  nodes: Node<ServiceMapNodeData>[],
  edges: Edge[]
): { nodes: Node<ServiceMapNodeData>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 80,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    const width = node.data.isService ? 100 : 80;
    const height = node.data.isService ? 100 : 80;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const width = node.data.isService ? 100 : 80;
    const height = node.data.isService ? 100 : 80;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface ReactFlowGraphProps {
  elements: cytoscape.ElementDefinition[];
  height: number;
  serviceName?: string;
  status: FETCH_STATUS;
}

// Inner component that uses React Flow hooks
function ReactFlowGraphInner({ elements, height, status }: ReactFlowGraphProps) {
  const { euiTheme } = useEuiTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ServiceMapNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (elements.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: transformedNodes, edges: transformedEdges } = transformElements(elements);
    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(
      transformedNodes,
      transformedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [elements, setNodes, setEdges]);

  const containerStyle = useMemo(
    () => ({
      height,
      width: '100%',
      background: `linear-gradient(
        90deg,
        ${euiTheme.colors.backgroundBasePlain}
          calc(${euiTheme.size.l} - calc(${euiTheme.size.xs} / 2)),
        transparent 1%
      )
      center,
      linear-gradient(
        ${euiTheme.colors.backgroundBasePlain}
          calc(${euiTheme.size.l} - calc(${euiTheme.size.xs} / 2)),
        transparent 1%
      )
      center,
      ${euiTheme.colors.lightShade}`,
      backgroundSize: `${euiTheme.size.l} ${euiTheme.size.l}`,
      cursor: status === FETCH_STATUS.LOADING ? 'wait' : 'grab',
    }),
    [height, euiTheme, status]
  );

  return (
    <div style={containerStyle} data-test-subj="reactFlowServiceMapInner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 200 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
        defaultEdgeOptions={{
          type: 'default',
          style: { stroke: euiTheme.colors.mediumShade },
        }}
      >
        <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
        <Controls
          showInteractive={false}
          style={{
            backgroundColor: euiTheme.colors.backgroundBasePlain,
            borderRadius: 4,
            border: `1px solid ${euiTheme.colors.lightShade}`,
          }}
        />
      </ReactFlow>
      {status === FETCH_STATUS.LOADING && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        >
          <EuiLoadingSpinner size="xl" />
        </div>
      )}
    </div>
  );
}

/**
 * React Flow Graph Component with Provider
 */
export default function ReactFlowGraph(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
