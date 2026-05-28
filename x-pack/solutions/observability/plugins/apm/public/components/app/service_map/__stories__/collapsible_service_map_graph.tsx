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
  type FitViewOptions,
} from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import '@xyflow/react/dist/style.css';
import type { ServiceMapEdge, ServiceMapNode } from '../../../../../common/service_map';
import { isServiceNode } from '../../../../../common/service_map';
import { applyDagreLayout } from '../../../shared/service_map/layout';
import { DependencyNode } from '../../../shared/service_map/dependency_node';
import { GroupedResourcesNode } from '../../../shared/service_map/grouped_resources_node';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../service_map_edge';
import { ServiceMapOptionsPanel, ServiceMapOptionsPanelToggle } from '../service_map_options_panel';
import { FIT_VIEW_PADDING, FIT_VIEW_DURATION, FIT_VIEW_DEFER_MS } from '../constants';
import { useReducedMotion } from '../use_reduced_motion';
import {
  DEFAULT_SERVICE_MAP_VIEW_FILTERS,
  type ServiceMapViewFilters,
} from '../apply_service_map_visibility';
import { computeServiceMapFilterOptionCounts } from '../service_map_filter_option_counts';
import {
  filterServiceMapWithExpansions,
  hasActiveServiceMapViewFilters,
} from './service_contextual_map_expand_utils';
import {
  CollapsibleServiceMapProvider,
  type CollapsibleServiceMapContextValue,
} from './collapsible_service_map_context';
import { ServiceNodeWithCollapseAffordance } from './service_node_with_collapse_affordance';

const collapsibleNodeTypes: NodeTypes = {
  service: ServiceNodeWithCollapseAffordance,
  dependency: DependencyNode,
  groupedResources: GroupedResourcesNode,
};

const edgeTypes: EdgeTypes = {
  default: ServiceMapEdgeComponent,
};

interface CollapsibleServiceMapGraphProps {
  height: number | string;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  focalServiceId: string;
  baseMaxHops: number;
  maxVisibleNodes: number;
  expandedNodeIds: ReadonlySet<string>;
  onExpand: (nodeId: string) => void;
  onCollapse: (nodeId: string) => void;
  highlightedServiceName?: string;
  viewFilters?: ServiceMapViewFilters;
  onViewFiltersChange?: (filters: ServiceMapViewFilters) => void;
}

function CollapsibleGraphInner({
  height,
  nodes: fullNodes,
  edges: fullEdges,
  focalServiceId,
  baseMaxHops,
  maxVisibleNodes,
  expandedNodeIds,
  onExpand,
  onCollapse,
  highlightedServiceName,
  viewFilters: viewFiltersProp,
  onViewFiltersChange,
}: CollapsibleServiceMapGraphProps) {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();
  const { getAnimationDuration } = useReducedMotion();
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [internalFilters, setInternalFilters] = useState<ServiceMapViewFilters>(
    DEFAULT_SERVICE_MAP_VIEW_FILTERS
  );
  const viewFilters = viewFiltersProp ?? internalFilters;
  const setViewFilters = onViewFiltersChange ?? setInternalFilters;

  const filterOptionCounts = useMemo(
    () => computeServiceMapFilterOptionCounts(fullNodes, fullEdges),
    [fullNodes, fullEdges]
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
        viewFilters,
      }),
    [
      focalServiceId,
      baseMaxHops,
      maxVisibleNodes,
      expandedNodeIds,
      fullNodes,
      fullEdges,
      viewFilters,
    ]
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

  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(visibleEdges);
    if (layoutedNodes.length > 0) {
      const duration = getAnimationDuration(FIT_VIEW_DURATION);
      const timer = setTimeout(
        () => fitView({ padding: FIT_VIEW_PADDING, duration }),
        FIT_VIEW_DEFER_MS
      );
      return () => clearTimeout(timer);
    }
  }, [layoutedNodes, visibleEdges, setNodes, setEdges, fitView, getAnimationDuration]);

  const hasActiveFilters = hasActiveServiceMapViewFilters(viewFilters);

  const collapseContext = useMemo<CollapsibleServiceMapContextValue>(
    () => ({
      expandedNodeIds,
      hasActiveFilters,
      onExpand,
      onCollapse,
      getHiddenServiceCount: (nodeId) => visibility.hiddenServiceCountByNodeId.get(nodeId) ?? 0,
      getHiddenAttentionCount: (nodeId) => visibility.hiddenAttentionCountByNodeId.get(nodeId) ?? 0,
      getHiddenMatchingServiceCount: (nodeId) =>
        visibility.hiddenMatchingServiceCountByNodeId.get(nodeId) ?? 0,
    }),
    [expandedNodeIds, hasActiveFilters, onExpand, onCollapse, visibility]
  );

  const containerStyle = useMemo(
    () => ({
      height,
      width: '100%',
      background: euiTheme.colors.backgroundBasePlain,
    }),
    [height, euiTheme]
  );

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

  const onInit = useCallback(() => {
    if (layoutedNodes.length > 0) {
      fitView({
        padding: FIT_VIEW_PADDING,
        duration: getAnimationDuration(FIT_VIEW_DURATION),
      } as FitViewOptions);
    }
  }, [fitView, layoutedNodes.length, getAnimationDuration]);

  return (
    <CollapsibleServiceMapProvider value={collapseContext}>
      <div css={css(containerStyle)} data-test-subj="collapsibleServiceMapGraph">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={collapsibleNodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          fitView
          fitViewOptions={{
            padding: FIT_VIEW_PADDING,
            duration: getAnimationDuration(FIT_VIEW_DURATION),
          }}
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
            <ServiceMapOptionsPanelToggle
              isExpanded={panelExpanded}
              onExpandedChange={setPanelExpanded}
            />
            {panelExpanded && (
              <ServiceMapOptionsPanel
                nodes={layoutedNodes}
                filterOptionCounts={filterOptionCounts}
                connectionFilter={viewFilters.connectionFilter}
                onConnectionFilterChange={(next) =>
                  setViewFilters((prev) => ({ ...prev, connectionFilter: next }))
                }
                alertStatusFilter={viewFilters.alertStatusFilter}
                onAlertStatusFilterChange={(next) =>
                  setViewFilters((prev) => ({ ...prev, alertStatusFilter: next }))
                }
                sloStatusFilter={viewFilters.sloStatusFilter}
                onSloStatusFilterChange={(next) =>
                  setViewFilters((prev) => ({ ...prev, sloStatusFilter: next }))
                }
                anomalySeverityFilter={viewFilters.anomalySeverityFilter}
                onAnomalySeverityFilterChange={(next) =>
                  setViewFilters((prev) => ({ ...prev, anomalySeverityFilter: next }))
                }
                mapOrientation="horizontal"
                onMapOrientationChange={() => {}}
              />
            )}
          </Panel>
        </ReactFlow>
      </div>
    </CollapsibleServiceMapProvider>
  );
}

export function CollapsibleServiceMapGraph(props: CollapsibleServiceMapGraphProps) {
  return (
    <ReactFlowProvider>
      <CollapsibleGraphInner {...props} />
    </ReactFlowProvider>
  );
}
