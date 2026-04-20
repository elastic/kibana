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
  ControlButton,
  Panel,
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
  EuiIcon,
  useGeneratedHtmlId,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import '@xyflow/react/dist/style.css';
import { css } from '@emotion/react';
import type { ApmPluginStartDeps, ApmServices } from '../../../plugin';
import { getDagreLayoutFailureDiagnostics } from './dagre_layout_failure_diagnostics';
import { applyDagreLayout } from './layout';
import { FIT_VIEW_PADDING, FIT_VIEW_DURATION, FIT_VIEW_DEFER_MS } from './constants';
import { ServiceNode } from './service_node';
import { DependencyNode } from './dependency_node';
import { GroupedResourcesNode } from './grouped_resources_node';
import { ServiceMapEdge } from './service_map_edge';
import { useEdgeHighlighting } from './use_edge_highlighting';
import { useReducedMotion } from './use_reduced_motion';
import { useKeyboardNavigation } from './use_keyboard_navigation';
import { MapPopover } from './popover';
import { ServiceMapMinimap } from './service_map_minimap';
import {
  applyServiceMapVisibility,
  DEFAULT_SERVICE_MAP_VIEW_FILTERS,
  type ServiceMapViewFilters,
} from './apply_service_map_visibility';
import { computeServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
import { focusServiceMapFindInput } from './service_map_find_in_page';
import { ServiceMapOptionsPanel, type ServiceMapOrientation } from './service_map_options_panel';
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
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** When set, shows a "View full service map" button that links to the full map (focused map only) */
  fullMapHref?: string;
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
  isFullscreen = false,
  onToggleFullscreen,
  fullMapHref,
}: GraphProps) {
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const { telemetry } = services;
  const { euiTheme } = useEuiTheme();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeForPopover, setSelectedNodeForPopover] = useState<ServiceMapNode | null>(null);
  const [selectedEdgeForPopover, setSelectedEdgeForPopover] = useState<ServiceMapEdgeType | null>(
    null
  );
  const serviceMapId = useGeneratedHtmlId({ prefix: 'serviceMap' });
  const mapRegionRef = useRef<HTMLDivElement | null>(null);

  const [viewFilters, setViewFilters] = useState<ServiceMapViewFilters>(
    DEFAULT_SERVICE_MAP_VIEW_FILTERS
  );
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [mapOrientation, setMapOrientation] = useState<ServiceMapOrientation>('horizontal');

  // Track the current selected node for use in layout effect without triggering re-layout
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;
  const selectedEdgeForPopoverRef = useRef<string | null>(null);
  selectedEdgeForPopoverRef.current = selectedEdgeForPopover?.id ?? null;

  const { applyEdgeHighlighting } = useEdgeHighlighting();

  const { getAnimationDuration } = useReducedMotion();
  const getFitViewOptions = useCallback(
    (): FitViewOptions => ({
      padding: FIT_VIEW_PADDING,
      duration: getAnimationDuration(FIT_VIEW_DURATION),
    }),
    [getAnimationDuration]
  );

  // EBT + console fire once per failed layout computation (each useMemo re-run that throws),
  // not strictly once per page visit—intentional for measuring failure frequency.
  const onDagreLayoutFailure = useCallback(
    (error: unknown) => {
      telemetry.reportServiceMapDagreLayoutFallback(getDagreLayoutFailureDiagnostics(error));
      console.error('[APM Service map] Dagre.layout failed; using grid fallback.', error);
    },
    [telemetry]
  );

  const layoutedNodes = useMemo(
    () =>
      applyDagreLayout(
        initialNodes,
        initialEdges,
        {
          rankdir: mapOrientation === 'vertical' ? 'TB' : 'LR',
        },
        onDagreLayoutFailure
      ),
    [initialNodes, initialEdges, mapOrientation, onDagreLayoutFailure]
  );

  const filterOptionCounts = useMemo(
    () => computeServiceMapFilterOptionCounts(initialNodes),
    [initialNodes]
  );

  const { nodes: nodesAfterFilters, edges: edgesAfterFilters } = useMemo(
    () => applyServiceMapVisibility(layoutedNodes, initialEdges, viewFilters),
    [layoutedNodes, initialEdges, viewFilters]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<ServiceMapNode>(nodesAfterFilters);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ServiceMapEdgeType>(edgesAfterFilters);

  useEffect(() => {
    setNodes(nodesAfterFilters);
    setEdges(
      applyEdgeHighlighting(edgesAfterFilters, {
        selectedNodeId: selectedNodeIdRef.current,
        selectedEdgeId: selectedEdgeForPopoverRef.current,
      })
    );

    if (nodesAfterFilters.length > 0) {
      const timer = setTimeout(() => fitView(getFitViewOptions()), FIT_VIEW_DEFER_MS);
      return () => clearTimeout(timer);
    }
  }, [
    nodesAfterFilters,
    edgesAfterFilters,
    setNodes,
    setEdges,
    fitView,
    applyEdgeHighlighting,
    getFitViewOptions,
  ]);

  const handleNodeClick: NodeMouseHandler<ServiceMapNode> = useCallback(
    (_, node) => {
      // Use ref so toggle logic always matches last committed selection without stale closure issues,
      // and keep this callback stable for React Flow.
      const newSelectedId = selectedNodeIdRef.current === node.id ? null : node.id;
      setSelectedNodeId(newSelectedId);
      setEdges((currentEdges) => applyEdgeHighlighting(currentEdges, newSelectedId));
      setSelectedNodeForPopover(newSelectedId ? node : null);
      setSelectedEdgeForPopover(null);
    },
    [setEdges, applyEdgeHighlighting]
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

  useEffect(() => {
    if (selectedNodeId && nodesAfterFilters.some((n) => n.id === selectedNodeId && n.hidden)) {
      handlePopoverClose();
    }
  }, [nodesAfterFilters, selectedNodeId, handlePopoverClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'k') {
        return;
      }
      const active = document.activeElement;
      const inMapRegion = Boolean(active && mapRegionRef.current?.contains(active));
      const isBareDocumentFocus =
        active == null || active === document.body || active === document.documentElement;

      if (!inMapRegion && !isBareDocumentFocus) {
        return;
      }
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setPanelExpanded(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          focusServiceMapFindInput();
        });
      });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === keys.ESCAPE && isFullscreen && onToggleFullscreen) {
        e.preventDefault();
        onToggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  const fullscreenButtonLabel = isFullscreen
    ? i18n.translate('xpack.apm.serviceMap.fullScreenExitButton', {
        defaultMessage: 'Exit fullscreen (esc)',
      })
    : i18n.translate('xpack.apm.serviceMap.fullScreenButton', {
        defaultMessage: 'Enter fullscreen',
      });

  const viewFullMapButtonLabel = i18n.translate('xpack.apm.serviceMap.viewFullServiceMapButton', {
    defaultMessage: 'View full service map',
  });

  const zoomInLabel = i18n.translate('xpack.apm.serviceMap.zoomInControl', {
    defaultMessage: 'Zoom In',
  });
  const zoomOutLabel = i18n.translate('xpack.apm.serviceMap.zoomOutControl', {
    defaultMessage: 'Zoom Out',
  });
  const fitViewLabel = i18n.translate('xpack.apm.serviceMap.fitViewControl', {
    defaultMessage: 'Fit View',
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

  const controlsStyles = useMemo(
    () => css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
      box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.colors.shadow};
      z-index: ${euiTheme.levels.content};
      position: relative;
      margin: 0;

      .serviceMapRfControlButton {
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        fill: ${euiTheme.colors.text};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${euiTheme.size.s};
        cursor: pointer;
        border-left: none;
        border-right: none;
        border-top: none;
        width: auto;
        min-width: 32px;
        min-height: 32px;
        align-self: stretch;
        box-sizing: border-box;
        color: inherit;

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

      a.serviceMapRfControlLink {
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        fill: ${euiTheme.colors.text};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${euiTheme.size.s};
        cursor: pointer;
        border-left: none;
        border-right: none;
        border-top: none;
        width: 100%;
        box-sizing: border-box;
        color: inherit;
        text-decoration: none;

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
        .serviceMapRfControlButton {
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
      'When focus is in the map region or on the page background (no text field focused), press Command K or Control K to open find in page and focus the search field. ' +
      'The options panel and zoom controls in the top left allow you to filter, change layout, zoom in, zoom out, and fit the view.',
  });

  return (
    <div
      ref={mapRegionRef}
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
        <Panel position="top-left" css={topLeftToolbarStyles}>
          <ServiceMapOptionsPanel
            nodes={nodesAfterFilters}
            filterOptionCounts={filterOptionCounts}
            alertStatusFilter={viewFilters.alertStatusFilter}
            onAlertStatusFilterChange={(next) =>
              setViewFilters((prev) => ({ ...prev, alertStatusFilter: next }))
            }
            sloStatusFilter={viewFilters.sloStatusFilter}
            onSloStatusFilterChange={(next) =>
              setViewFilters((prev) => ({ ...prev, sloStatusFilter: next }))
            }
            anomalyStatusFilter={viewFilters.anomalyStatusFilter}
            onAnomalyStatusFilterChange={(next) =>
              setViewFilters((prev) => ({ ...prev, anomalyStatusFilter: next }))
            }
            mapOrientation={mapOrientation}
            onMapOrientationChange={setMapOrientation}
            isExpanded={panelExpanded}
            onExpandedChange={setPanelExpanded}
          />
          <div
            className="react-flow__controls vertical"
            css={controlsStyles}
            data-testid="rf__controls"
            data-test-subj="serviceMapControls"
          >
            <ControlButton
              onClick={() => zoomIn()}
              title={zoomInLabel}
              aria-label={zoomInLabel}
              className="serviceMapRfControlButton"
              data-test-subj="serviceMapZoomInButton"
            >
              <EuiIcon type="plus" aria-hidden={true} />
            </ControlButton>
            <ControlButton
              onClick={() => zoomOut()}
              title={zoomOutLabel}
              aria-label={zoomOutLabel}
              className="serviceMapRfControlButton"
              data-test-subj="serviceMapZoomOutButton"
            >
              <EuiIcon type="minus" aria-hidden={true} />
            </ControlButton>
            <ControlButton
              onClick={() => fitView(getFitViewOptions())}
              title={fitViewLabel}
              aria-label={fitViewLabel}
              className="serviceMapRfControlButton"
              data-test-subj="serviceMapFitViewButton"
            >
              <EuiIcon type="expand" aria-hidden={true} />
            </ControlButton>
            {fullMapHref && (
              <a
                className="serviceMapRfControlLink"
                href={fullMapHref}
                title={viewFullMapButtonLabel}
                aria-label={viewFullMapButtonLabel}
                data-test-subj="serviceMapViewFullMapButton"
              >
                <EuiIcon type="apps" aria-label={viewFullMapButtonLabel} />
              </a>
            )}
            {onToggleFullscreen && (
              <ControlButton
                onClick={onToggleFullscreen}
                title={fullscreenButtonLabel}
                aria-label={fullscreenButtonLabel}
                className="serviceMapRfControlButton"
                data-test-subj="serviceMapFullScreenButton"
              >
                <EuiIcon
                  type={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
                  aria-label={fullscreenButtonLabel}
                />
              </ControlButton>
            )}
          </div>
        </Panel>
        <ServiceMapMinimap />
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
