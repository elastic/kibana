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
  type EdgeMouseHandler,
} from '@xyflow/react';
import {
  useEuiTheme,
  EuiScreenReaderOnly,
  EuiScreenReaderLive,
  useGeneratedHtmlId,
} from '@elastic/eui';
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
import { useReducedMotion } from './use_reduced_motion';
import { useKeyboardNavigation } from './use_keyboard_navigation';
import { MapPopover } from './popover';
import type { Environment } from '../../../../common/environment_rt';
import type {
  ServiceMapNode,
  ServiceMapEdge as ServiceMapEdgeType,
} from '../../../../common/service_map';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  groupedResources: GroupedResourcesNode,
};

const edgeTypes: EdgeTypes = {
  default: ServiceMapEdge,
};

interface GraphProps {
  height: number;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdgeType[];
  /** Currently focused service name (for service-specific map) */
  serviceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
}

function GraphInner({
  height,
  nodes: initialNodes,
  edges: initialEdges,
  serviceName,
  environment,
  kuery,
  start,
  end,
}: GraphProps) {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeForPopover, setSelectedNodeForPopover] = useState<ServiceMapNode | null>(null);
  const [selectedEdgeForPopover, setSelectedEdgeForPopover] = useState<ServiceMapEdgeType | null>(
    null
  );
  const serviceMapId = useGeneratedHtmlId({ prefix: 'serviceMap' });

  // Track the current selected node for use in layout effect without triggering re-layout
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  const { applyEdgeHighlighting } = useEdgeHighlighting();

  const { getAnimationDuration } = useReducedMotion();
  const getFitViewOptions = useCallback(
    (): FitViewOptions => ({
      padding: FIT_VIEW_PADDING,
      duration: getAnimationDuration(FIT_VIEW_DURATION),
    }),
    [getAnimationDuration]
  );

  const layoutedNodes = useMemo(
    () => applyDagreLayout(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<ServiceMapNode>(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ServiceMapEdgeType>(initialEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(applyEdgeHighlighting(initialEdges, selectedNodeIdRef.current));

    if (layoutedNodes.length > 0) {
      setTimeout(() => fitView(getFitViewOptions()), 50);
    }
  }, [
    layoutedNodes,
    initialEdges,
    setNodes,
    setEdges,
    fitView,
    applyEdgeHighlighting,
    getFitViewOptions,
  ]);

  const handleNodeClick: NodeMouseHandler<ServiceMapNode> = useCallback(
    (_, node) => {
      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);
      setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, newSelectedId));
      setSelectedNodeForPopover(newSelectedId ? node : null);
      setSelectedEdgeForPopover(null);
    },
    [selectedNodeId, setEdges, applyEdgeHighlighting]
  );
  const handleEdgeClick: EdgeMouseHandler<ServiceMapEdgeType> = useCallback(
    (_, edge) => {
      setSelectedNodeId(null);
      setSelectedNodeForPopover(null);
      const newSelectedEdge = selectedEdgeForPopover?.id === edge.id ? null : edge;
      setSelectedEdgeForPopover(newSelectedEdge);
      setEdges((currentEdges) =>
        applyEdgeHighlighting(currentEdges, { selectedEdgeId: newSelectedEdge?.id ?? null })
      );
    },
    [selectedEdgeForPopover, setEdges, applyEdgeHighlighting]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeForPopover(null);
    setSelectedEdgeForPopover(null);
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: false,
      }))
    );
    setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, null));
  }, [setNodes, setEdges, applyEdgeHighlighting]);

  const handlePopoverClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeForPopover(null);
    setSelectedEdgeForPopover(null);
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: false,
      }))
    );
    setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, null));
  }, [setNodes, setEdges, applyEdgeHighlighting]);

  // Close popover when user starts dragging (map panning or node dragging)
  const handleDragStart = useCallback(() => {
    if (selectedNodeForPopover || selectedEdgeForPopover) {
      handlePopoverClose();
    }
  }, [selectedNodeForPopover, selectedEdgeForPopover, handlePopoverClose]);

  // Handle node selection from keyboard navigation
  const handleKeyboardNodeSelect = useCallback(
    (node: ServiceMapNode | null) => {
      if (node) {
        setSelectedNodeId(node.id);
        setSelectedNodeForPopover(node);
        setSelectedEdgeForPopover(null);
        setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, node.id));
      } else {
        handlePopoverClose();
      }
    },
    [setEdges, applyEdgeHighlighting, handlePopoverClose]
  );

  // Handle edge selection from keyboard navigation
  const handleKeyboardEdgeSelect = useCallback(
    (edge: ServiceMapEdgeType | null) => {
      if (edge) {
        setSelectedNodeId(null);
        setSelectedNodeForPopover(null);
        setSelectedEdgeForPopover(edge);
        setEdges((currentEdges) =>
          applyEdgeHighlighting(currentEdges, { selectedEdgeId: edge.id })
        );
      } else {
        handlePopoverClose();
      }
    },
    [setEdges, applyEdgeHighlighting, handlePopoverClose]
  );

  // Use keyboard navigation hook for accessibility
  const { screenReaderAnnouncement } = useKeyboardNavigation({
    nodes,
    edges,
    selectedNodeId,
    selectedNodeForPopover,
    selectedEdgeForPopover,
    onNodeSelect: handleKeyboardNodeSelect,
    onEdgeSelect: handleKeyboardEdgeSelect,
    onPopoverClose: handlePopoverClose,
  });

  const containerStyle = useMemo(
    () => ({
      height,
      width: '100%',
      overflow: 'auto',
      zIndex: Number(euiTheme.levels.content) + 1,
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

  const controlsStyles = useMemo(
    () => css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
      box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.colors.shadow};
      z-index: ${euiTheme.levels.content};
      position: relative;
      margin: ${euiTheme.size.s};

      button {
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        fill: ${euiTheme.colors.text};

        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        }

        &:focus-visible {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: -2px;
          z-index: ${euiTheme.levels.content};
          position: relative;
        }

        &:last-child {
          border-bottom: none;
        }

        svg {
          fill: currentColor;
        }
      }

      /* Scale down controls when viewport is constrained (happens at 200% zoom) */
      @media (max-width: 960px) {
        margin: ${euiTheme.size.xxs} !important;
        overflow: auto;
        button {
          min-width: 24px;
          min-height: 24px;
        }
      }
    `,
    [euiTheme]
  );

  const onInit = useCallback(() => {
    if (layoutedNodes.length > 0) {
      fitView(getFitViewOptions());
    }
  }, [fitView, layoutedNodes.length, getFitViewOptions]);

  const screenReaderInstructions = i18n.translate('xpack.apm.serviceMap.screenReaderInstructions', {
    defaultMessage:
      'This is an interactive service map showing application services and their dependencies. ' +
      'Use Tab to navigate between service nodes. Use Arrow keys to move between adjacent nodes. ' +
      'Press Enter or Space to select a node and view its details including connections. ' +
      'Press Escape to close the details popover. ' +
      'The zoom controls in the top left allow you to zoom in, zoom out, and fit the view.',
  });

  return (
    <div
      css={css(containerStyle)}
      data-test-subj="serviceMapGraph"
      role="group"
      tabIndex={0}
      aria-label={i18n.translate('xpack.apm.serviceMap.regionLabel', {
        defaultMessage: 'Service map with {nodeCount} services and dependencies.',
        values: { nodeCount: nodes.length },
      })}
      aria-describedby={serviceMapId}
    >
      <EuiScreenReaderOnly>
        <div id={serviceMapId}>{screenReaderInstructions}</div>
      </EuiScreenReaderOnly>
      <EuiScreenReaderLive>{screenReaderAnnouncement}</EuiScreenReaderLive>
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
        onMoveStart={handleDragStart}
        onNodeDragStart={handleDragStart}
        onInit={onInit}
        fitView
        fitViewOptions={getFitViewOptions()}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        nodesFocusable={true}
        edgesFocusable={false}
      >
        <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
        <Controls showInteractive={false} position="top-left" css={controlsStyles} />
      </ReactFlow>
      <MapPopover
        selectedNode={selectedNodeForPopover}
        selectedEdge={selectedEdgeForPopover}
        focusedServiceName={serviceName}
        environment={environment}
        kuery={kuery}
        start={start}
        end={end}
        onClose={handlePopoverClose}
      />
    </div>
  );
}

export function ServiceMapGraph(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
