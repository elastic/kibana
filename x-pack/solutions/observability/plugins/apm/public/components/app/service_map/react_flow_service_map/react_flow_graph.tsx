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
  EuiButtonIcon,
  EuiToolTip,
  EuiBadge,
  EuiText,
  EuiIcon,
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
import { ReactFlowPopover } from './react_flow_popover';
import type { Environment } from '../../../../../common/environment_rt';
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

interface ReactFlowGraphProps {
  height: number;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdgeType[];
  /** Currently focused service name (for service-specific map) */
  serviceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  /** Whether path selection mode is active */
  pathMode?: boolean;
  /** Origin service selected in path mode */
  pathOrigin?: string;
  /** Target service selected in path mode */
  pathTarget?: string;
  /** Callback when a service node is clicked in path mode */
  onPathNodeClick?: (serviceNodeId: string) => void;
  /** Callback to toggle path mode on/off */
  onPathModeToggle?: () => void;
}

function ReactFlowGraphInner({
  height,
  nodes: initialNodes,
  edges: initialEdges,
  serviceName,
  environment,
  kuery,
  start,
  end,
  pathMode,
  pathOrigin,
  pathTarget,
  onPathNodeClick,
  onPathModeToggle,
}: ReactFlowGraphProps) {
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

  // Effect 1: Apply layout and edge highlighting when graph data changes
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

  // Effect 2: Apply path filtering (BFS + hidden + pathRole) when path selections change.
  // Uses functional updates so it works on current node/edge state without rebuilding.
  // BFS runs against the full (unfiltered) initialEdges to ensure correct path finding.
  useEffect(() => {
    const pathNodeIds =
      pathMode && pathOrigin && pathTarget
        ? findPathNodes(initialEdges, pathOrigin, pathTarget)
        : null;

    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        hidden: pathNodeIds ? !pathNodeIds.has(n.id) : false,
        data: {
          ...n.data,
          pathRole:
            pathMode && n.id === pathOrigin
              ? ('origin' as const)
              : pathMode && n.id === pathTarget
              ? ('target' as const)
              : undefined,
        },
      }))
    );

    setEdges((currentEdges) =>
      currentEdges.map((e) => ({
        ...e,
        hidden: pathNodeIds ? !pathNodeIds.has(e.source) || !pathNodeIds.has(e.target) : false,
      }))
    );

    // Only re-fit when a path is actively being shown or cleared
    if (pathNodeIds || (!pathMode && (pathOrigin || pathTarget))) {
      setTimeout(() => fitView(getFitViewOptions()), 50);
    }
  }, [
    pathMode,
    pathOrigin,
    pathTarget,
    initialEdges,
    setNodes,
    setEdges,
    fitView,
    getFitViewOptions,
  ]);

  const handleNodeClick: NodeMouseHandler<ServiceMapNode> = useCallback(
    (_, node) => {
      // In path mode, clicking a service node selects it as origin/destination
      if (pathMode && node.data.isService && onPathNodeClick) {
        onPathNodeClick(node.id);
        return;
      }

      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);
      setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, newSelectedId));
      setSelectedNodeForPopover(newSelectedId ? node : null);
      setSelectedEdgeForPopover(null);
    },
    [selectedNodeId, setEdges, applyEdgeHighlighting, pathMode, onPathNodeClick]
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
      position: 'relative' as const,
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
      data-test-subj="reactFlowServiceMap"
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
      {/* Path mode toggle and status */}
      <div
        css={css`
          position: absolute;
          top: ${euiTheme.size.s};
          right: ${euiTheme.size.s};
          z-index: ${euiTheme.levels.content};
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}
      >
        {pathMode && (pathOrigin || pathTarget) && (
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
              background: ${euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
              border-radius: ${euiTheme.border.radius.medium};
              padding: ${euiTheme.size.xs} ${euiTheme.size.s};
              box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.colors.shadow};
            `}
          >
            {pathOrigin && <EuiBadge color="primary">{pathOrigin}</EuiBadge>}
            {pathOrigin && !pathTarget && (
              <EuiText size="xs" color="subdued">
                <EuiIcon type="sortRight" size="s" aria-hidden={true} />{' '}
                {i18n.translate('xpack.apm.serviceMap.pathMode.selectDestination', {
                  defaultMessage: 'Click destination',
                })}
              </EuiText>
            )}
            {pathTarget && (
              <>
                <EuiIcon type="sortRight" size="s" aria-hidden={true} />
                <EuiBadge color="success">{pathTarget}</EuiBadge>
              </>
            )}
          </div>
        )}
        {pathMode && !pathOrigin && (
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
              border-radius: ${euiTheme.border.radius.medium};
              padding: ${euiTheme.size.xs} ${euiTheme.size.s};
              box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.colors.shadow};
            `}
          >
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.apm.serviceMap.pathMode.selectOrigin', {
                defaultMessage: 'Click a service to set origin',
              })}
            </EuiText>
          </div>
        )}
        <EuiToolTip
          content={
            pathMode
              ? i18n.translate('xpack.apm.serviceMap.pathMode.disable', {
                  defaultMessage: 'Exit path mode',
                })
              : i18n.translate('xpack.apm.serviceMap.pathMode.enable', {
                  defaultMessage: 'Find path between services',
                })
          }
        >
          <EuiButtonIcon
            iconType="link"
            aria-label={i18n.translate('xpack.apm.serviceMap.pathMode.toggle', {
              defaultMessage: 'Toggle path mode',
            })}
            display={pathMode ? 'fill' : 'empty'}
            size="m"
            color={pathMode ? 'primary' : 'text'}
            onClick={onPathModeToggle}
            data-test-subj="serviceMapPathModeToggle"
            css={css`
              background-color: ${pathMode
                ? euiTheme.colors.primary
                : euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.width.thin} solid
                ${pathMode ? euiTheme.colors.primary : euiTheme.colors.lightShade};
              border-radius: ${euiTheme.border.radius.medium};
              box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.colors.shadow};
            `}
          />
        </EuiToolTip>
      </div>
      <ReactFlowPopover
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

/**
 * Finds all node IDs that lie on ANY directed path from origin to target.
 *
 * Uses two BFS passes:
 *   1. Forward BFS from origin following edge direction (source -> target)
 *   2. Backward BFS from target following reversed edges (target -> source)
 *
 * A node is on a path if it appears in both sets (reachable from origin AND
 * can reach target). This captures all parallel routes, not just one shortest path.
 *
 * Returns null if no directed path exists (caller should treat as "show all").
 */
function findPathNodes(
  edgeList: ServiceMapEdgeType[],
  origin: string,
  target: string
): Set<string> | null {
  // Build directed adjacency (forward) and reverse adjacency (backward)
  const forward = new Map<string, Set<string>>();
  const reverse = new Map<string, Set<string>>();

  for (const edge of edgeList) {
    if (!forward.has(edge.source)) forward.set(edge.source, new Set());
    forward.get(edge.source)!.add(edge.target);

    if (!reverse.has(edge.target)) reverse.set(edge.target, new Set());
    reverse.get(edge.target)!.add(edge.source);
  }

  // Forward BFS from origin
  const reachableFromOrigin = bfs(origin, forward);

  // If target is not reachable from origin, no path exists
  if (!reachableFromOrigin.has(target)) {
    return null;
  }

  // Backward BFS from target (using reversed edges)
  const canReachTarget = bfs(target, reverse);

  // Intersection: nodes on any directed path from origin to target
  const pathNodes = new Set<string>();
  for (const node of reachableFromOrigin) {
    if (canReachTarget.has(node)) {
      pathNodes.add(node);
    }
  }

  return pathNodes;
}

/** Simple BFS returning all reachable nodes from a start node. */
function bfs(start: string, adjacency: Map<string, Set<string>>): Set<string> {
  const visited = new Set<string>();
  const queue = [start];
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

export function ReactFlowServiceMap(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
