/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Panel,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
  type FitViewOptions,
} from '@xyflow/react';
import { EuiButtonIcon, EuiFlexGroup, EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import '@xyflow/react/dist/style.css';
import type { ServiceMapEdge, ServiceMapNode } from '../../../../../common/service_map';
import { isServiceNode } from '../../../../../common/service_map';
import { applyDagreLayout } from '../../../shared/service_map/layout';
import { DependencyNode } from '../../../shared/service_map/dependency_node';
import { GroupedResourcesNode } from '../../../shared/service_map/grouped_resources_node';
import { ServiceMapHighlightProvider } from '../../../shared/service_map/service_map_search_context';
import { ServiceMapAlertsNavigateGraphWrapper } from '../service_map_alerts_navigate_graph_wrapper';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../service_map_edge';
import { MapPopover } from '../popover';
import { useEdgeHighlighting } from '../use_edge_highlighting';
import { useReducedMotion } from '../use_reduced_motion';
import { FIT_VIEW_PADDING, FIT_VIEW_DURATION, FIT_VIEW_DEFER_MS } from '../constants';
import type { Environment } from '../../../../../common/environment_rt';
import { filterServiceMapWithExpansions } from './contextual_map_visibility';
import {
  CollapsibleServiceMapProvider,
  type CollapsibleServiceMapContextValue,
} from './collapsible_service_map_context';
import { ServiceNodeWithCollapseAffordance } from './service_node_with_collapse_affordance';
import { ContextualServiceMapControls } from './contextual_service_map_controls';

const contextualNodeTypes: NodeTypes = {
  service: ServiceNodeWithCollapseAffordance,
  dependency: DependencyNode,
  groupedResources: GroupedResourcesNode,
};

const edgeTypes: EdgeTypes = {
  default: ServiceMapEdgeComponent,
};

export interface ContextualServiceMapGraphProps {
  height: number | string;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  focalServiceId: string;
  baseMaxHops: number;
  maxVisibleNodes: number;
  expandedNodeIds: ReadonlySet<string>;
  onExpand: (nodeId: string) => void;
  onCollapse: (nodeId: string) => void;
  onBaseMaxHopsChange: (value: number) => void;
  onMaxVisibleNodesChange: (value: number) => void;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  highlightedServiceName?: string;
  fullMapHref?: string;
  showFocusMap?: boolean;
  clearKueryOnPopoverNavigation?: boolean;
  alwaysNavigateOnPopoverFocus?: boolean;
  /** When false, max visible / hops controls are rendered by the host (e.g. service overview header). */
  showContextControls?: boolean;
}

function ContextualGraphInner({
  height,
  nodes: fullNodes,
  edges: fullEdges,
  focalServiceId,
  baseMaxHops,
  maxVisibleNodes,
  expandedNodeIds,
  onExpand,
  onCollapse,
  onBaseMaxHopsChange,
  onMaxVisibleNodesChange,
  environment,
  kuery,
  start,
  end,
  highlightedServiceName,
  fullMapHref,
  showFocusMap,
  clearKueryOnPopoverNavigation,
  alwaysNavigateOnPopoverFocus,
  showContextControls = true,
}: ContextualServiceMapGraphProps) {
  const { euiTheme } = useEuiTheme();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { getAnimationDuration } = useReducedMotion();
  const { applyEdgeHighlighting } = useEdgeHighlighting();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeForPopover, setSelectedNodeForPopover] = useState<ServiceMapNode | null>(null);

  const expandedNodeIdsKey = useMemo(
    () => [...expandedNodeIds].sort((a, b) => a.localeCompare(b)).join('\0'),
    [expandedNodeIds]
  );

  const {
    nodes: visibleNodes,
    edges: visibleEdges,
    visibility,
  } = useMemo(
    () =>
      filterServiceMapWithExpansions({
        focalNodeId: focalServiceId,
        baseMaxHops,
        maxVisibleNodes,
        expandedNodeIds,
        nodes: fullNodes,
        edges: fullEdges,
      }),
    [focalServiceId, baseMaxHops, maxVisibleNodes, expandedNodeIds, fullNodes, fullEdges]
  );

  const layoutedNodes = useMemo(() => {
    const laidOut = applyDagreLayout(visibleNodes, visibleEdges, { rankdir: 'LR' });
    return laidOut.map((n) => {
      if (!isServiceNode(n)) {
        return n;
      }
      const contextHighlight = Boolean(highlightedServiceName && n.id === highlightedServiceName);
      return { ...n, data: { ...n.data, contextHighlight } };
    });
  }, [visibleNodes, visibleEdges, highlightedServiceName]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  const getFitViewOptions = useCallback(
    (): FitViewOptions => ({
      padding: FIT_VIEW_PADDING,
      duration: getAnimationDuration(FIT_VIEW_DURATION),
    }),
    [getAnimationDuration]
  );

  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(visibleEdges);
    if (layoutedNodes.length > 0) {
      const timer = setTimeout(() => fitView(getFitViewOptions()), FIT_VIEW_DEFER_MS);
      return () => clearTimeout(timer);
    }
  }, [layoutedNodes, visibleEdges, setNodes, setEdges, fitView, getFitViewOptions]);

  React.useEffect(() => {
    setSelectedNodeId(null);
    setSelectedNodeForPopover(null);
  }, [expandedNodeIdsKey]);

  const collapseContext = useMemo<CollapsibleServiceMapContextValue>(
    () => ({
      expandedNodeIds,
      onExpand,
      onCollapse,
      getHiddenDependencyCount: (nodeId) =>
        visibility.hiddenDependencyCountByNodeId.get(nodeId) ?? 0,
      getHiddenAttentionCount: (nodeId) => visibility.hiddenAttentionCountByNodeId.get(nodeId) ?? 0,
    }),
    [expandedNodeIds, onExpand, onCollapse, visibility]
  );

  const handleNodeClick: NodeMouseHandler<ServiceMapNode> = useCallback(
    (_, node) => {
      const newSelectedId = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);
      setSelectedNodeForPopover(newSelectedId ? node : null);
      setEdges((currentEdges) =>
        applyEdgeHighlighting(currentEdges, { selectedNodeId: newSelectedId, selectedEdgeId: null })
      );
    },
    [selectedNodeId, setEdges, applyEdgeHighlighting]
  );

  const handlePopoverClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeForPopover(null);
  }, []);

  const topLeftToolbarStyles = useMemo(
    () => css`
      display: flex;
      flex-direction: column;
      gap: ${euiTheme.size.s};
      align-items: flex-start;
      margin: ${euiTheme.size.s};
    `,
    [euiTheme]
  );

  const mapToolbarControlIconCss = useMemo(
    () => css`
      min-inline-size: calc(${euiTheme.size.base} * 2);
      min-block-size: calc(${euiTheme.size.base} * 2);
    `,
    [euiTheme]
  );

  const zoomInLabel = i18n.translate('xpack.apm.serviceMap.zoomInControl', {
    defaultMessage: 'Zoom In',
  });
  const zoomOutLabel = i18n.translate('xpack.apm.serviceMap.zoomOutControl', {
    defaultMessage: 'Zoom Out',
  });
  const fitViewLabel = i18n.translate('xpack.apm.serviceMap.fitViewControl', {
    defaultMessage: 'Fit View',
  });
  const viewFullMapButtonLabel = i18n.translate('xpack.apm.serviceMap.viewFullServiceMapButton', {
    defaultMessage: 'View full service map',
  });

  return (
    <ServiceMapHighlightProvider>
      <CollapsibleServiceMapProvider value={collapseContext}>
        <div
          data-test-subj="contextualServiceMapGraph"
          style={{ height, width: '100%', position: 'relative' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={contextualNodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePopoverClose}
            onInit={() => {
              if (layoutedNodes.length > 0) {
                fitView(getFitViewOptions());
              }
            }}
            fitView
            fitViewOptions={getFitViewOptions()}
            minZoom={0.2}
            maxZoom={3}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable
            edgesFocusable={false}
          >
            <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
            <Panel position="top-left" css={topLeftToolbarStyles}>
              {showContextControls && (
                <ContextualServiceMapControls
                  baseMaxHops={baseMaxHops}
                  maxVisibleNodes={maxVisibleNodes}
                  onBaseMaxHopsChange={onBaseMaxHopsChange}
                  onMaxVisibleNodesChange={onMaxVisibleNodesChange}
                />
              )}
              <EuiPanel hasBorder paddingSize="none" grow={false}>
                <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
                  <EuiToolTip content={zoomInLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="contextualServiceMapZoomInButton"
                      display="empty"
                      color="text"
                      size="s"
                      iconType="plus"
                      onClick={() => zoomIn()}
                      aria-label={zoomInLabel}
                      css={mapToolbarControlIconCss}
                    />
                  </EuiToolTip>
                  <EuiToolTip content={zoomOutLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="contextualServiceMapZoomOutButton"
                      display="empty"
                      color="text"
                      size="s"
                      iconType="minus"
                      onClick={() => zoomOut()}
                      aria-label={zoomOutLabel}
                      css={mapToolbarControlIconCss}
                    />
                  </EuiToolTip>
                  <EuiToolTip content={fitViewLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="contextualServiceMapFitViewButton"
                      display="empty"
                      color="text"
                      size="s"
                      iconType="crosshair"
                      onClick={() => fitView(getFitViewOptions())}
                      aria-label={fitViewLabel}
                      css={mapToolbarControlIconCss}
                    />
                  </EuiToolTip>
                  {fullMapHref && (
                    <EuiToolTip content={viewFullMapButtonLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        display="empty"
                        color="text"
                        size="s"
                        iconType="apps"
                        href={fullMapHref}
                        aria-label={viewFullMapButtonLabel}
                        data-test-subj="serviceMapViewFullMapButton"
                        css={mapToolbarControlIconCss}
                      />
                    </EuiToolTip>
                  )}
                </EuiFlexGroup>
              </EuiPanel>
            </Panel>
          </ReactFlow>
          <MapPopover
            selectedNode={selectedNodeForPopover}
            selectedEdge={null}
            focusedServiceName={focalServiceId}
            environment={environment}
            kuery={kuery}
            start={start}
            end={end}
            onClose={handlePopoverClose}
            isEmbedded
            showFocusMap={showFocusMap}
            alwaysNavigateOnFocus={alwaysNavigateOnPopoverFocus}
            clearKueryOnNavigation={clearKueryOnPopoverNavigation}
          />
        </div>
      </CollapsibleServiceMapProvider>
    </ServiceMapHighlightProvider>
  );
}

export function ContextualServiceMapGraph(props: ContextualServiceMapGraphProps) {
  return (
    <ReactFlowProvider>
      <ServiceMapAlertsNavigateGraphWrapper>
        <ContextualGraphInner {...props} />
      </ServiceMapAlertsNavigateGraphWrapper>
    </ReactFlowProvider>
  );
}
