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
import {
  EuiLoadingSpinner,
  EuiButtonGroup,
  EuiToolTip,
  useEuiTheme,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type cytoscape from 'cytoscape';
import '@xyflow/react/dist/style.css';
import { css } from '@emotion/react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { Environment } from '../../../../../common/environment_rt';

import type { ServiceMapNodeData } from './service_node';
import { ServiceNode } from './service_node';
import { DependencyNode } from './dependency_node';
import { GroupNode } from './group_node';
import { transformElements, type ServiceMapEdgeData } from './transform_data';
import { applyLayout, type LayoutDirection } from './apply_layout';
import { ReactFlowPopover } from './react_flow_popover';
import { useExpandCollapse, type GroupNodeData } from './use_expand_collapse';
import { createGroupsFromServiceGroups } from './grouping_utils';
import { useServiceGroups } from './use_service_groups';
import { ServiceGroupSelector } from './service_group_selector';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  group: GroupNode,
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
  /** Enable expand/collapse grouping of connected services */
  enableGrouping?: boolean;
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
  enableGrouping = true,
}: ReactFlowGraphProps) {
  const { euiTheme } = useEuiTheme();
  const reactFlowInstance = useReactFlow();
  const { fitView } = reactFlowInstance;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ServiceMapNodeData | GroupNodeData>>(
    []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ServiceMapEdgeData>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');
  const [selectedNodeForPopover, setSelectedNodeForPopover] = useState<Node<
    ServiceMapNodeData | GroupNodeData
  > | null>(null);

  // State for selected service groups (dynamic grouping)
  const [selectedServiceGroupIds, setSelectedServiceGroupIds] = useState<string[]>([]);

  // Fetch available service groups
  const { serviceGroups: savedServiceGroups, loading: loadingServiceGroups } = useServiceGroups();

  const primaryColor = euiTheme.colors.primary;

  // Transform elements once (these are the "all" nodes/edges for grouping)
  const { allNodes, allEdges } = useMemo(() => {
    if (elements.length === 0) {
      return { allNodes: [], allEdges: [] };
    }
    const { nodes: transformedNodes, edges: transformedEdges } = transformElements(
      elements,
      EDGE_COLOR_DEFAULT
    );
    return { allNodes: transformedNodes, allEdges: transformedEdges };
  }, [elements]);

  // Create groups only when service groups are explicitly selected from the dropdown
  const serviceGroups = useMemo(() => {
    if (!enableGrouping || allNodes.length === 0 || selectedServiceGroupIds.length === 0) {
      return [];
    }

    return createGroupsFromServiceGroups(allNodes, savedServiceGroups, selectedServiceGroupIds);
  }, [enableGrouping, allNodes, selectedServiceGroupIds, savedServiceGroups]);

  // Use expand/collapse hook for managing visibility
  const {
    visibleNodes,
    visibleEdges,
    toggleGroup,
    expandAll,
    collapseAll,
    collapseGroup,
    expandedGroups,
  } = useExpandCollapse({
    allNodes,
    allEdges,
    groups: serviceGroups,
  });

  const hasGroups = serviceGroups.length > 0;
  const allExpanded = serviceGroups.every((g) => expandedGroups.has(g.id));

  // Track the current selected node for use in layout effect without triggering re-layout
  const selectedNodeIdRef = React.useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  // Pre-computed marker objects to avoid recreating them on every edge update
  const markers = useMemo(
    () => ({
      defaultEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: EDGE_COLOR_DEFAULT,
      } as EdgeMarker,
      highlightedEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: primaryColor,
      } as EdgeMarker,
      defaultStart: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: EDGE_COLOR_DEFAULT,
      } as EdgeMarker,
      highlightedStart: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: primaryColor,
      } as EdgeMarker,
    }),
    [primaryColor]
  );

  // Helper to apply edge highlighting based on selected node
  const applyEdgeHighlighting = useCallback(
    (edgesToHighlight: Edge<ServiceMapEdgeData>[], nodeId: string | null) => {
      return edgesToHighlight.map((edge) => {
        const isConnected = nodeId !== null && (edge.source === nodeId || edge.target === nodeId);

        // Use pre-computed marker objects
        const markerEnd = isConnected ? markers.highlightedEnd : markers.defaultEnd;
        const markerStart = edge.data?.isBidirectional
          ? isConnected
            ? markers.highlightedStart
            : markers.defaultStart
          : undefined;

        return {
          ...edge,
          style: {
            stroke: isConnected ? primaryColor : EDGE_COLOR_DEFAULT,
            strokeWidth: isConnected ? 2 : 1,
          },
          markerEnd,
          markerStart,
          zIndex: isConnected ? 1000 : 0,
        };
      });
    },
    [primaryColor, markers]
  );

  // Stable reference to collapseGroup to avoid recreating node objects on every render
  const collapseGroupRef = React.useRef(collapseGroup);
  collapseGroupRef.current = collapseGroup;

  // Stable callback that uses the ref
  const stableCollapseGroup = useCallback((groupId: string) => {
    collapseGroupRef.current(groupId);
  }, []);

  // Apply layout when visible nodes/edges change or layout direction changes
  useEffect(() => {
    if (visibleNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(
      visibleNodes as Node<ServiceMapNodeData>[],
      visibleEdges,
      { rankdir: layoutDirection }
    );

    // Add collapseGroup callback to nodes that belong to groups
    // Using stable callback reference to avoid unnecessary re-renders
    const nodesWithCallbacks = layoutedNodes.map((node) => {
      if (node.data.groupId) {
        return {
          ...node,
          data: {
            ...node.data,
            onCollapseGroup: stableCollapseGroup,
          },
        };
      }
      return node;
    });

    setNodes(nodesWithCallbacks);
    // Preserve highlighting if a node is selected (using ref to avoid triggering re-layout)
    setEdges(applyEdgeHighlighting(layoutedEdges, selectedNodeIdRef.current));
    // Fit view after layout change with a small delay to ensure nodes are rendered
    setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 50);
  }, [
    visibleNodes,
    visibleEdges,
    layoutDirection,
    applyEdgeHighlighting,
    setNodes,
    setEdges,
    fitView,
    stableCollapseGroup,
  ]);

  const handleLayoutDirectionChange = useCallback((optionId: string) => {
    setLayoutDirection(optionId as LayoutDirection);
  }, []);

  // Handle node click - update node selection and edge highlighting
  const handleNodeClick: NodeMouseHandler<Node<ServiceMapNodeData | GroupNodeData>> = useCallback(
    (_, node) => {
      // Check if this is a group node - if so, toggle expand/collapse
      const nodeData = node.data as ServiceMapNodeData | GroupNodeData;
      if ('isGroup' in nodeData && nodeData.isGroup) {
        // Extract the group ID from the node ID (format: "group-{groupId}")
        const groupId = node.id.replace('group-', '');
        toggleGroup(groupId);
        return;
      }

      // Regular node click behavior
      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);

      setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, newSelectedId));
      setSelectedNodeForPopover(newSelectedId ? node : null);
    },
    [selectedNodeId, setEdges, applyEdgeHighlighting, toggleGroup]
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

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle ESC to close popover
      if (event.key === 'Escape' && selectedNodeForPopover) {
        event.preventDefault();
        setSelectedNodeId(null);
        setSelectedNodeForPopover(null);
        setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, null));
        // Clear selection from nodes
        setNodes((currentNodes) => currentNodes.map((n) => ({ ...n, selected: false })));
        return;
      }

      // Handle Enter/Space to open popover on the focused node
      if (event.key === 'Enter' || event.key === ' ') {
        // Find the currently focused node by checking the DOM
        const activeElement = document.activeElement;
        const nodeElement = activeElement?.closest('[data-id]');

        if (nodeElement) {
          const nodeId = nodeElement.getAttribute('data-id');
          const focusedNode = nodes.find((n) => n.id === nodeId);

          if (focusedNode) {
            event.preventDefault();

            // If clicking the same node, close popover
            if (selectedNodeId === nodeId) {
              setSelectedNodeId(null);
              setSelectedNodeForPopover(null);
              setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, null));
              setNodes((currentNodes) => currentNodes.map((n) => ({ ...n, selected: false })));
            } else {
              // Clear previous selection and select the focused node
              setNodes((currentNodes) =>
                currentNodes.map((n) => ({ ...n, selected: n.id === nodeId }))
              );
              setSelectedNodeId(nodeId);
              setSelectedNodeForPopover(focusedNode);
              setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, nodeId));
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes, selectedNodeId, selectedNodeForPopover, setNodes, setEdges, applyEdgeHighlighting]);

  const handleMove = useCallback(() => {
    if (selectedNodeForPopover) {
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
        aria-label={i18n.translate('xpack.apm.serviceMap.ariaLabel', {
          defaultMessage: 'Service map showing {nodeCount} services and dependencies',
          values: { nodeCount: nodes.length },
        })}
      >
        <Background gap={24} size={1} color={euiTheme.colors.lightShade} />

        {/* Service Group Selector - Top Left */}
        {enableGrouping && savedServiceGroups.length > 0 && (
          <Panel position="top-left">
            <ServiceGroupSelector
              serviceGroups={savedServiceGroups}
              selectedGroupIds={selectedServiceGroupIds}
              onSelectionChange={setSelectedServiceGroupIds}
              loading={loadingServiceGroups}
            />
          </Panel>
        )}

        <Panel position="top-right">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {/* Expand/Collapse controls - only show when grouping is enabled and groups exist */}
            {enableGrouping && hasGroups && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    allExpanded
                      ? i18n.translate('xpack.apm.serviceMap.collapseAll.tooltip', {
                          defaultMessage: 'Collapse all service groups',
                        })
                      : i18n.translate('xpack.apm.serviceMap.expandAll.tooltip', {
                          defaultMessage: 'Expand all service groups',
                        })
                  }
                >
                  <EuiButtonEmpty
                    size="xs"
                    iconType={allExpanded ? 'minimize' : 'expand'}
                    onClick={allExpanded ? collapseAll : expandAll}
                    data-test-subj="serviceMapExpandCollapseToggle"
                    css={css`
                      background-color: ${euiTheme.colors.backgroundBasePlain};
                      border-radius: ${euiTheme.border.radius.medium};
                      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
                    `}
                  >
                    {allExpanded
                      ? i18n.translate('xpack.apm.serviceMap.collapseAll', {
                          defaultMessage: 'Collapse',
                        })
                      : i18n.translate('xpack.apm.serviceMap.expandAll', {
                          defaultMessage: 'Expand',
                        })}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
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
                  data-test-subj="serviceMapLayoutToggle"
                  css={css`
                    background-color: ${euiTheme.colors.backgroundBasePlain};
                    border-radius: ${euiTheme.border.radius.medium};
                    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
                    padding: ${euiTheme.size.xs};
                  `}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
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
