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
  Panel,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type EdgeMarker,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import { EuiLoadingSpinner, EuiButtonGroup, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type cytoscape from 'cytoscape';
import '@xyflow/react/dist/style.css';
import { css } from '@emotion/react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { Environment } from '../../../../../common/environment_rt';

import type { ServiceMapNodeData } from './service_node';
import { ServiceNode } from './service_node';
import { DependencyNode } from './dependency_node';
import { transformElements, type ServiceMapEdgeData } from './transform_data';
import { applyLayout, type LayoutDirection } from './apply_layout';
import { ReactFlowPopover } from './react_flow_popover';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
};

// Default edge colors
const EDGE_COLOR_DEFAULT = '#98A2B3';

interface ReactFlowGraphProps {
  elements: cytoscape.ElementDefinition[];
  height: number;
  serviceName?: string;
  status: FETCH_STATUS;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
}

const layoutDirectionOptions = [
  {
    id: 'LR',
    label: i18n.translate('xpack.apm.serviceMap.layoutDirection.horizontal', {
      defaultMessage: 'Horizontal',
    }),
    iconType: 'sortRight',
  },
  {
    id: 'TB',
    label: i18n.translate('xpack.apm.serviceMap.layoutDirection.vertical', {
      defaultMessage: 'Vertical',
    }),
    iconType: 'sortDown',
  },
];

// Inner component that uses React Flow hooks
function ReactFlowGraphInner({
  elements,
  height,
  status,
  environment,
  kuery,
  start,
  end,
  serviceName,
}: ReactFlowGraphProps) {
  const { euiTheme } = useEuiTheme();
  const reactFlowInstance = useReactFlow();
  const { fitView } = reactFlowInstance;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ServiceMapNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ServiceMapEdgeData>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const [selectedNodeForPopover, setSelectedNodeForPopover] =
    useState<Node<ServiceMapNodeData> | null>(null);
  const popoverOpenTimeRef = React.useRef<number>(0);
  const lastViewportRef = React.useRef({ x: 0, y: 0, zoom: 1 });
  const reactFlowInstanceRef = React.useRef(reactFlowInstance);

  // Update ref when reactFlowInstance changes
  React.useEffect(() => {
    reactFlowInstanceRef.current = reactFlowInstance;
  }, [reactFlowInstance]);

  const primaryColor = euiTheme.colors.primary;

  // Track the current selected node for use in layout effect without triggering re-layout
  const selectedNodeIdRef = React.useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  // Helper to apply edge highlighting based on selected node
  const applyEdgeHighlighting = useCallback(
    (edgesToHighlight: Edge<ServiceMapEdgeData>[], nodeId: string | null) => {
      return edgesToHighlight.map((edge) => {
        const isConnected = nodeId !== null && (edge.source === nodeId || edge.target === nodeId);
        const color = isConnected ? primaryColor : EDGE_COLOR_DEFAULT;
        const strokeWidth = isConnected ? 3 : 1;
        const markerSize = isConnected ? 24 : 20;

        // Always create complete marker objects to ensure arrows render in all layouts
        const markerEnd: EdgeMarker = {
          type: MarkerType.ArrowClosed,
          width: markerSize,
          height: markerSize,
          color,
        };

        const markerStart: EdgeMarker | undefined = edge.data?.isBidirectional
          ? { type: MarkerType.ArrowClosed, width: markerSize, height: markerSize, color }
          : undefined;

        return {
          ...edge,
          style: { stroke: color, strokeWidth },
          markerEnd,
          markerStart,
          zIndex: isConnected ? 1000 : 0,
        };
      });
    },
    [primaryColor]
  );

  // Transform and layout elements when they change or layout direction changes
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
      transformedEdges,
      { rankdir: layoutDirection }
    );

    setNodes(layoutedNodes);
    // Preserve highlighting if a node is selected (using ref to avoid triggering re-layout)
    setEdges(applyEdgeHighlighting(layoutedEdges, selectedNodeIdRef.current));
    // Fit view after layout change with a small delay to ensure nodes are rendered
    setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 50);
  }, [elements, layoutDirection, applyEdgeHighlighting, setNodes, setEdges, fitView]);

  const handleLayoutDirectionChange = useCallback((optionId: string) => {
    setLayoutDirection(optionId as LayoutDirection);
  }, []);

  // Handle node click - update node selection and edge highlighting
  const handleNodeClick: NodeMouseHandler<Node<ServiceMapNodeData>> = useCallback(
    (event, node) => {
      event.stopPropagation();
      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);

      // Update node selection state
      setNodes((currentNodes) =>
        currentNodes.map((n) => ({
          ...n,
          selected: n.id === newSelectedId,
        }))
      );

      // Update edge highlighting
      setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, newSelectedId));
      setSelectedNodeForPopover(newSelectedId ? node : null);

      // Track when popover opens and store current viewport
      if (newSelectedId) {
        popoverOpenTimeRef.current = Date.now();
        lastViewportRef.current = reactFlowInstanceRef.current.getViewport();
      }
    },
    [selectedNodeId, setNodes, setEdges, applyEdgeHighlighting]
  );

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);

    // Clear node selection
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: false,
      }))
    );

    // Clear edge highlighting
    setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, null));
    setSelectedNodeForPopover(null);
  }, [setNodes, setEdges, applyEdgeHighlighting]);

  // Handle viewport changes (pan/zoom) - close popover
  const handleMove = useCallback(() => {
    if (!selectedNodeForPopover) return;

    // Small delay to prevent closing from click-triggered move events
    const timeSinceOpen = Date.now() - popoverOpenTimeRef.current;
    if (timeSinceOpen < 100) return;

    // Get current viewport
    const currentViewport = reactFlowInstanceRef.current.getViewport();
    const lastViewport = lastViewportRef.current;

    // Check if there's actual meaningful movement (> 5px or zoom change > 0.01)
    const deltaX = Math.abs(currentViewport.x - lastViewport.x);
    const deltaY = Math.abs(currentViewport.y - lastViewport.y);
    const deltaZoom = Math.abs(currentViewport.zoom - lastViewport.zoom);

    if (deltaX > 5 || deltaY > 5 || deltaZoom > 0.01) {
      lastViewportRef.current = currentViewport;
      setSelectedNodeId(null);
      setSelectedNodeForPopover(null);

      // Reset edges
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
    }
  }, [selectedNodeForPopover, setEdges]);

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
        onMove={handleMove}
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
        <Panel position="top-right">
          <EuiToolTip
            content={i18n.translate('xpack.apm.serviceMap.layoutDirection.tooltip', {
              defaultMessage: 'Change layout orientation',
            })}
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.apm.serviceMap.layoutDirection.legend', {
                defaultMessage: 'Layout direction',
              })}
              options={layoutDirectionOptions}
              idSelected={layoutDirection}
              onChange={handleLayoutDirectionChange}
              buttonSize="compressed"
              isIconOnly
              css={css`
                background-color: ${euiTheme.colors.backgroundBasePlain};
                border-radius: ${euiTheme.border.radius.medium};
                border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
                padding: ${euiTheme.size.xs};
              `}
            />
          </EuiToolTip>
        </Panel>
        <Controls
          showInteractive={false}
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
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
      <ReactFlowPopover
        selectedNode={selectedNodeForPopover}
        focusedServiceName={serviceName}
        environment={environment}
        kuery={kuery}
        start={start}
        end={end}
        onClose={() => {
          setSelectedNodeId(null);
          setSelectedNodeForPopover(null);
        }}
      />
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
