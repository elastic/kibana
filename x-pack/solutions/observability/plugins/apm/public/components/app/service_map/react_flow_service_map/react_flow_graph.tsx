/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Node,
  type Edge,
  type EdgeMarker,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type cytoscape from 'cytoscape';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { css } from '@emotion/react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

import type { ServiceMapNodeData } from './service_node';
import { ServiceNode } from './service_node';
import { DependencyNode } from './dependency_node';
import { transformElements, type ServiceMapEdgeData } from './transform_data';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
};

// Default edge colors
const EDGE_COLOR_DEFAULT = '#98A2B3';

// Apply Dagre layout (left-to-right like Cytoscape version)
function applyLayout(
  nodes: Node<ServiceMapNodeData>[],
  edges: Edge<ServiceMapEdgeData>[]
): { nodes: Node<ServiceMapNodeData>[]; edges: Edge<ServiceMapEdgeData>[] } {
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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ServiceMapEdgeData>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const primaryColor = euiTheme.colors.primary;

  // Transform and layout elements when they change
  useEffect(() => {
    if (elements.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: transformedNodes, edges: transformedEdges } = transformElements(
      elements,
      EDGE_COLOR_DEFAULT
    );
    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(
      transformedNodes,
      transformedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [elements, setNodes, setEdges]);

  // Handle node click - update edges with highlight colors (GitHub discussion approach)
  const handleNodeClick: NodeMouseHandler<Node<ServiceMapNodeData>> = useCallback(
    (_, node) => {
      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);

      // Update all edges based on selection to mark them blue if they are connected to the selected node
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          const isConnected =
            newSelectedId !== null &&
            (edge.source === newSelectedId || edge.target === newSelectedId);
          const color = isConnected ? primaryColor : EDGE_COLOR_DEFAULT;
          const strokeWidth = isConnected ? 3 : 1;

          return {
            ...edge,
            style: { stroke: color, strokeWidth },
            markerEnd: {
              ...(edge.markerEnd as EdgeMarker),
              color,
            },
            markerStart: edge.data?.isBidirectional
              ? {
                  ...(edge.markerStart as EdgeMarker),
                  color,
                }
              : undefined,
            zIndex: isConnected ? 1000 : 0,
          };
        })
      );
    },
    [selectedNodeId, setEdges, primaryColor]
  );

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);

    // Reset all edges to default
    setEdges((currentEdges) =>
      currentEdges.map((edge) => ({
        ...edge,
        style: { stroke: EDGE_COLOR_DEFAULT, strokeWidth: 1 },
        markerEnd: {
          ...(edge.markerEnd as EdgeMarker),
          color: EDGE_COLOR_DEFAULT,
        },
        markerStart: edge.data?.isBidirectional
          ? {
              ...(edge.markerStart as EdgeMarker),
              color: EDGE_COLOR_DEFAULT,
            }
          : undefined,
        zIndex: 0,
      }))
    );
  }, [setEdges]);

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
    <div css={css(containerStyle)} data-test-subj="reactFlowServiceMapInner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 200 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
        <Controls
          showInteractive={false}
          css={css`{  
            backgroundColor: ${euiTheme.colors.backgroundBasePlain};
            border-radius: ${euiTheme.border.radius.medium};
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
          `}
        />
      </ReactFlow>
      {status === FETCH_STATUS.LOADING && (
        <div
          css={css`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
          `}
        >
          <EuiLoadingSpinner size="xl" />
        </div>
      )}
    </div>
  );
}

/**
 * React Flow Service Map Component
 * A POC implementation using React Flow to compare with the existing Cytoscape.js implementation
 */
export function ReactFlowServiceMap(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
