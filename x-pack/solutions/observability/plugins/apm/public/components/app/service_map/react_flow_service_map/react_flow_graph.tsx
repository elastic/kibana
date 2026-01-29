/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type FitViewOptions,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import '@xyflow/react/dist/style.css';
import { css } from '@emotion/react';
import { applyDagreLayout } from './layout';
import { FIT_VIEW_PADDING, FIT_VIEW_DURATION } from './constants';
import { ServiceNode } from './service_node';
import { DependencyNode } from './dependency_node';
import { GroupedResourcesNode } from './grouped_resources_node';
import { ServiceMapEdge } from './service_map_edge';
import { useEdgeHighlighting } from './use_edge_highlighting';
import type {
  ServiceMapNode,
  ServiceMapEdge as ServiceMapEdgeType,
} from '../../../../../common/service_map';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  groupedResources: GroupedResourcesNode,
};

const edgeTypes: EdgeTypes = {
  default: ServiceMapEdge,
};

const fitViewOptions: FitViewOptions = { padding: FIT_VIEW_PADDING, duration: FIT_VIEW_DURATION };

interface ReactFlowGraphProps {
  height: number;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdgeType[];
}

function ReactFlowGraphInner({
  height,
  nodes: initialNodes,
  edges: initialEdges,
}: ReactFlowGraphProps) {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Track the current selected node for use in layout effect without triggering re-layout
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  // Use the edge highlighting hook
  const { applyEdgeHighlighting } = useEdgeHighlighting();

  // Apply layout to nodes
  const layoutedNodes = useMemo(
    () => applyDagreLayout(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<ServiceMapNode>(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ServiceMapEdgeType>(initialEdges);

  // Update nodes and edges when props change
  useEffect(() => {
    setNodes(layoutedNodes);
    // Apply edge highlighting preserving selection state
    setEdges(applyEdgeHighlighting(initialEdges, selectedNodeIdRef.current));

    // Fit view after nodes are updated
    if (layoutedNodes.length > 0) {
      setTimeout(() => fitView(fitViewOptions), 50);
    }
  }, [layoutedNodes, initialEdges, setNodes, setEdges, fitView, applyEdgeHighlighting]);

  // Handle node click - update node selection and edge highlighting
  const handleNodeClick: NodeMouseHandler<ServiceMapNode> = useCallback(
    (_, node) => {
      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);
      setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, newSelectedId));
    },
    [selectedNodeId, setEdges, applyEdgeHighlighting]
  );

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: false,
      }))
    );
    setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, null));
  }, [setNodes, setEdges, applyEdgeHighlighting]);

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
    }),
    [height, euiTheme]
  );

  const onInit = useCallback(() => {
    if (layoutedNodes.length > 0) {
      fitView(fitViewOptions);
    }
  }, [fitView, layoutedNodes.length]);

  return (
    <div css={css(containerStyle)} data-test-subj="reactFlowServiceMap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={onInit}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
        aria-label={i18n.translate('xpack.apm.serviceMap.ariaLabel', {
          defaultMessage:
            'Service map showing {nodeCount} services and dependencies. Use tab or arrow keys to navigate between nodes, enter or space to view details.',
          values: { nodeCount: nodes.length },
        })}
      >
        <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
        <Controls
          showInteractive={false}
          position="top-left"
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border-radius: ${euiTheme.border.radius.medium};
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
            box-shadow: none;

            button {
              background-color: ${euiTheme.colors.backgroundBasePlain};
              border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
              fill: ${euiTheme.colors.text};

              &:hover {
                background-color: ${euiTheme.colors.backgroundBaseSubdued};
              }

              &:last-child {
                border-bottom: none;
              }

              svg {
                fill: currentColor;
              }
            }
          `}
        />
      </ReactFlow>
    </div>
  );
}

export function ReactFlowServiceMap(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
