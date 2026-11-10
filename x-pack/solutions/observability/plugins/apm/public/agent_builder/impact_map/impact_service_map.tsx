/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, type ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  type ColorMode,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import '@xyflow/react/dist/style.css';
import type { ImpactMapRendererProps } from '@kbn/agentic-investigations-plugin/public';
import { getSeverityColor } from '../../../common/anomaly_detection';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getApmInternalServices } from '../../plugin';
import { InfrastructureNode } from './infrastructure_node';
import { GroupNode } from './group_node';
import { ImpactMapEdge } from './impact_edge';
import { ServiceGlyphNode } from './service_glyph_node';
import { applyEdgeHoverHighlight, EDGE_HOVERED_CLASS } from './edge_hover';
import { EntityTypeTooltip } from './entity_type_tooltip';
import { applyGroupedLayout, hasGroups } from './group_layout';
import { ServiceNode } from '../../components/shared/service_map/service_node';
import { applyDagreLayout } from '../../components/shared/service_map/layout';
import {
  IMPACT_SEVERITY_SCORES,
  transformImpactMap,
  type ImpactDependencyNodeData,
  type ImpactServiceNodeData,
  type ImpactServiceMapNode,
} from './transform_impact_map';

const BADGES: Record<'root_cause', { icon: IconType; score: number; label: string }> = {
  root_cause: {
    icon: 'bullseye',
    score: IMPACT_SEVERITY_SCORES.rootCause,
    label: i18n.translate('xpack.apm.impactMap.badge.rootCause', {
      defaultMessage: 'Root cause',
    }),
  },
};

const BADGE_SIZE = 22;

function StateBadge({ state, floating }: { state: 'root_cause'; floating?: boolean }) {
  const { euiTheme } = useEuiTheme();
  const { icon, score, label } = BADGES[state];
  return (
    <EuiToolTip
      content={<EuiText size="xs">{label}</EuiText>}
      position="top"
      disableScreenReaderOutput
      // The tooltip's anchor is what has to sit on the node, or the tooltip opens where the
      // badge would have been in the flow.
      anchorProps={{
        css: floating
          ? css`
              position: absolute;
              top: -8px;
              left: calc(50% + 14px);
            `
          : undefined,
      }}
    >
      <span
        role="img"
        tabIndex={0}
        aria-label={label}
        data-test-subj={`impactMapBadge-${state}`}
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: none;
          width: ${BADGE_SIZE}px;
          height: ${BADGE_SIZE}px;
          border-radius: 50%;
          background: ${getSeverityColor(score)};
          border: 2px solid ${euiTheme.colors.backgroundBasePlain};
        `}
      >
        <EuiIcon type={icon} size="s" color={euiTheme.colors.darkestShade} aria-hidden="true" />
      </span>
    </EuiToolTip>
  );
}

function EventCountBadge({ count }: { count?: number }) {
  const { euiTheme } = useEuiTheme();
  if (!count) {
    return null;
  }
  const label = i18n.translate('xpack.apm.impactMap.badge.events', {
    defaultMessage: '{count, plural, one {# event} other {# events}}: click to see them',
    values: { count },
  });
  return (
    <EuiToolTip
      content={<EuiText size="xs">{label}</EuiText>}
      position="top"
      disableScreenReaderOutput
      anchorProps={{
        css: css`
          position: absolute;
          top: -8px;
          right: calc(50% + 14px);
        `,
      }}
    >
      <span
        role="img"
        tabIndex={0}
        aria-label={label}
        data-test-subj="impactMapEventCount"
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: ${BADGE_SIZE}px;
          height: ${BADGE_SIZE}px;
          padding: 0 ${euiTheme.size.xs};
          border-radius: ${BADGE_SIZE / 2}px;
          background: ${euiTheme.colors.primary};
          color: ${euiTheme.colors.textInverse};
          border: 2px solid ${euiTheme.colors.backgroundBasePlain};
          font-size: ${euiTheme.size.m};
          font-weight: ${euiTheme.font.weight.bold};
          line-height: 1;
        `}
      >
        {count}
      </span>
    </EuiToolTip>
  );
}

const ImpactServiceNode = memo((props: NodeProps<Node<ImpactServiceNodeData>>) => (
  <EntityTypeTooltip
    typeKindLabel={props.data.typeKindLabel}
    subtypeLabel={props.data.subtypeLabel}
  >
    {props.data.agentName ? (
      <ServiceNode {...(props as unknown as ComponentProps<typeof ServiceNode>)} />
    ) : (
      <ServiceGlyphNode {...props} />
    )}
    {props.data.impactState === 'root_cause' && <StateBadge state="root_cause" floating />}
    <EventCountBadge count={props.data.eventCount} />
  </EntityTypeTooltip>
));
ImpactServiceNode.displayName = 'ImpactServiceNode';

const ImpactInfrastructureNode = memo((props: NodeProps<Node<ImpactDependencyNodeData>>) => (
  <EntityTypeTooltip
    typeKindLabel={props.data.typeKindLabel}
    subtypeLabel={props.data.subtypeLabel}
  >
    <InfrastructureNode {...props} />
    {props.data.impactState === 'root_cause' && <StateBadge state="root_cause" floating />}
    <EventCountBadge count={props.data.eventCount} />
  </EntityTypeTooltip>
));
ImpactInfrastructureNode.displayName = 'ImpactInfrastructureNode';

const nodeTypes: NodeTypes = {
  impactGroup: GroupNode,
  impactInfrastructure: ImpactInfrastructureNode,
  service: ImpactServiceNode,
};

const edgeTypes: EdgeTypes = {
  impact: ImpactMapEdge,
};

const LEGEND = {
  rootCause: i18n.translate('xpack.apm.impactMap.legend.rootCause', {
    defaultMessage: 'Root cause',
  }),
  impacted: i18n.translate('xpack.apm.impactMap.legend.impacted', {
    defaultMessage: 'Impacted',
  }),
  criticalPath: i18n.translate('xpack.apm.impactMap.legend.criticalPath', {
    defaultMessage: 'Critical path',
  }),
  inferred: i18n.translate('xpack.apm.impactMap.legend.inferred', {
    defaultMessage: 'Inferred',
  }),
};

function ImpactMapLegend({
  criticalPathColor,
  showInferred,
}: {
  criticalPathColor: string;
  showInferred: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel paddingSize="xs" hasShadow={false} hasBorder data-test-subj="impactServiceMapLegend">
      <EuiFlexGroup gutterSize="m" wrap alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <StateBadge state="root_cause" />
            <EuiText size="xs">{LEGEND.rootCause}</EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <span
              css={css`
                display: block;
                width: ${BADGE_SIZE - 6}px;
                height: ${BADGE_SIZE - 6}px;
                border-radius: 50%;
                border: 3px solid ${getSeverityColor(IMPACT_SEVERITY_SCORES.impacted)};
              `}
            />
            <EuiText size="xs">{LEGEND.impacted}</EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                css={css`
                  display: block;
                  width: ${euiTheme.size.l};
                  border-top: 3px solid ${criticalPathColor};
                `}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{LEGEND.criticalPath}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {showInferred && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span
                  data-test-subj="impactServiceMapLegendInferred"
                  css={css`
                    display: block;
                    width: ${euiTheme.size.l};
                    border-top: 2px dashed ${euiTheme.colors.darkShade};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{LEGEND.inferred}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const CONTROL_LABELS = {
  zoomIn: i18n.translate('xpack.apm.impactMap.zoomIn', { defaultMessage: 'Zoom In' }),
  zoomOut: i18n.translate('xpack.apm.impactMap.zoomOut', { defaultMessage: 'Zoom Out' }),
  fitView: i18n.translate('xpack.apm.impactMap.fitView', { defaultMessage: 'Fit View' }),
  enterFullScreen: i18n.translate('xpack.apm.impactMap.enterFullScreen', {
    defaultMessage: 'Enter fullscreen',
  }),
  exitFullScreen: i18n.translate('xpack.apm.impactMap.exitFullScreen', {
    defaultMessage: 'Exit fullscreen (esc)',
  }),
};

/** The service map's own zoom, fit and full-screen controls, so the two maps handle alike. */
function MapControls({
  onToggleFullScreen,
  isFullScreen,
}: Pick<ImpactMapRendererProps, 'onToggleFullScreen' | 'isFullScreen'>) {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const iconCss = css`
    min-inline-size: calc(${euiTheme.size.base} * 2);
    min-block-size: calc(${euiTheme.size.base} * 2);
  `;
  const fullScreenLabel = isFullScreen
    ? CONTROL_LABELS.exitFullScreen
    : CONTROL_LABELS.enterFullScreen;
  const buttons = [
    { icon: 'plus', label: CONTROL_LABELS.zoomIn, id: 'ZoomIn', onClick: () => zoomIn() },
    { icon: 'minus', label: CONTROL_LABELS.zoomOut, id: 'ZoomOut', onClick: () => zoomOut() },
    {
      icon: 'crosshair',
      label: CONTROL_LABELS.fitView,
      id: 'FitView',
      onClick: () => fitView({ ...FIT_VIEW_OPTIONS, duration: 200 }),
    },
    ...(onToggleFullScreen
      ? [
          {
            icon: isFullScreen ? 'fullScreenExit' : 'fullScreen',
            label: fullScreenLabel,
            id: 'FullScreen',
            onClick: onToggleFullScreen,
          },
        ]
      : []),
  ];
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      borderRadius="m"
      grow={false}
      data-test-subj="impactServiceMapControls"
    >
      <EuiFlexGroup direction="column" gutterSize="none" alignItems="center" responsive={false}>
        {buttons.map(({ icon, label, id, onClick }) => (
          <EuiToolTip key={id} content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              display="empty"
              color="text"
              size="s"
              iconType={icon}
              onClick={onClick}
              aria-label={label}
              data-test-subj={`impactServiceMap${id}Button`}
              css={iconCss}
            />
          </EuiToolTip>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

/** Room for the controls and legend without zooming the graph into a sparse postage stamp. */
const FIT_VIEW_OPTIONS = {
  padding: { top: '72px', right: '6%', bottom: '6%', left: '6%' },
  maxZoom: 1.75,
};

/**
 * Compact enough to read as one diagram; rank gap still fits a short relationship pill between
 * icons without the empty-field look of a 300px separation.
 */
const IMPACT_LAYOUT = { nodeWidth: 160, nodeHeight: 96, ranksep: 140, nodesep: 56 };

const CLICKABLE_CLASS = 'impactMapClickable';

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** What APM said about a service, kept for the session so reopening a map draws at once. */
const agentNameCache = new Map<string, string | null>();

/**
 * The APM agent name of each service entity that has traces, so it draws with the same icon as on
 * the service map. A type that already names its agent needs no lookup, a service seen before is
 * answered from the cache, and each answer is drawn as it arrives instead of after the slowest.
 */
const useServiceAgentNames = (impactMap: ImpactMapRendererProps['impactMap']) => {
  const entityIds = useMemo(() => {
    const knownTypes = new Set(
      impactMap.entity_types
        .filter(({ kind, icon }) => kind !== 'service' || icon?.agent_name)
        .map(({ id }) => id)
    );
    return impactMap.entities.filter(({ type_id: t }) => !knownTypes.has(t)).map(({ id }) => id);
  }, [impactMap]);

  // The impact map is read again as the agent revises it, which makes a new list of the same
  // ids. Keyed on the ids themselves, a refetch does not restart the lookups.
  const idsKey = entityIds.join('\n');
  const serviceIds = useMemo(() => (idsKey ? idsKey.split('\n') : []), [idsKey]);

  const fromCache = useCallback(
    () =>
      Object.fromEntries(
        serviceIds.flatMap((id) => {
          const cached = agentNameCache.get(id);
          return cached ? [[id, cached]] : [];
        })
      ),
    [serviceIds]
  );
  const [agentNames, setAgentNames] = useState<Record<string, string>>(fromCache);
  useEffect(() => {
    setAgentNames(fromCache());
    const callApmApi = getApmInternalServices()?.callApmApi;
    const missing = serviceIds.filter((id) => !agentNameCache.has(id));
    if (!callApmApi || missing.length === 0) {
      return;
    }
    let isCurrent = true;
    const end = new Date();
    const start = new Date(end.getTime() - LOOKBACK_MS);
    // Never aborted: an answer that arrives after the effect re-ran still goes in the cache, so
    // a service is not left without its icon by a request that was cut short.
    const { signal } = new AbortController();
    missing.forEach((serviceName) => {
      callApmApi('GET /internal/apm/services/{serviceName}/agent', {
        signal,
        params: {
          path: { serviceName },
          query: {
            environment: ENVIRONMENT_ALL.value,
            start: start.toISOString(),
            end: end.toISOString(),
          },
        },
      }).then(
        ({ agentName }) => {
          agentNameCache.set(serviceName, agentName ?? null);
          if (agentName && isCurrent) {
            setAgentNames((current) => ({ ...current, [serviceName]: agentName }));
          }
        },
        () => undefined
      );
    });
    return () => {
      isCurrent = false;
    };
  }, [serviceIds, fromCache]);

  return agentNames;
};

/**
 * Measures the nodes again and keeps every one in view. The map is drawn inside a flyout that
 * animates open and resizes, and a fit done before the size settles, or before the nodes are
 * measured, leaves them small or off screen. So it measures and fits again whenever the
 * container's size, the layout or the set of nodes changes.
 */
function KeepNodesInView({ nodeIds, layout }: { nodeIds: string; layout: unknown }) {
  const { fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const initialized = useNodesInitialized();
  const size = useStore(({ width, height }) => `${width}x${height}`);
  useEffect(() => {
    if (size.startsWith('0x') || size.endsWith('x0')) {
      return;
    }
    let fitFrame = 0;
    const measureFrame = requestAnimationFrame(() => {
      updateNodeInternals(nodeIds.split('|'));
      fitFrame = requestAnimationFrame(() => fitView(FIT_VIEW_OPTIONS));
    });
    return () => {
      cancelAnimationFrame(measureFrame);
      cancelAnimationFrame(fitFrame);
    };
  }, [initialized, size, nodeIds, layout, fitView, updateNodeInternals]);
  return null;
}

/**
 * Draws an investigation's impact map with the service map's nodes and layout. Users can pan,
 * zoom and drag nodes, and click a node or an edge to see what happened to it.
 */
export function ImpactServiceMap({
  impactMap,
  onEntityClick,
  onRelationshipClick,
  onToggleFullScreen,
  isFullScreen,
}: ImpactMapRendererProps) {
  const { euiTheme, colorMode } = useEuiTheme();
  const criticalPathColor = euiTheme.colors.danger;
  const edgeColors = useMemo(
    () => ({ criticalPath: criticalPathColor }),
    [criticalPathColor]
  );

  const agentNames = useServiceAgentNames(impactMap);

  const { laidOutNodes, edges } = useMemo(() => {
    const graph = transformImpactMap(impactMap, edgeColors, agentNames);
    const layOut = (): ImpactServiceMapNode[] => {
      if (hasGroups(graph.nodes)) {
        try {
          return applyGroupedLayout<ImpactServiceMapNode>(graph.nodes, graph.edges, IMPACT_LAYOUT);
        } catch {
          // Draw the entities flat rather than nothing; a group box needs the layout that failed.
        }
      }
      const flat = graph.nodes.filter(({ type }) => type !== 'impactGroup');
      return applyDagreLayout<ImpactServiceMapNode>(
        flat,
        graph.edges.filter(
          ({ source, target }) =>
            flat.some(({ id }) => id === source) && flat.some(({ id }) => id === target)
        ),
        {
          nodeWidth: IMPACT_LAYOUT.nodeWidth,
          nodeHeight: IMPACT_LAYOUT.nodeHeight,
          ranksep: IMPACT_LAYOUT.ranksep,
          nodesep: IMPACT_LAYOUT.nodesep,
        }
      );
    };
    // Every entity and link can open its details, so every one looks clickable.
    return {
      laidOutNodes: layOut().map((node) => ({ ...node, className: CLICKABLE_CLASS })),
      edges: graph.edges.map((edge) => ({ ...edge, className: CLICKABLE_CLASS })),
    };
  }, [impactMap, edgeColors, agentNames]);

  // Local state so a dragged node stays put; a revised map from the agent lays out afresh.
  const [nodes, setNodes, onNodesChange] = useNodesState<ImpactServiceMapNode>(laidOutNodes);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  // A revised map or a late agent lookup replaces the nodes. Each keeps the size already measured:
  // the nodes do not remount, so nothing would measure them again, and without a size a node has
  // no handles and its edges are not drawn.
  useEffect(
    () =>
      setNodes((current) =>
        laidOutNodes.map((node) => {
          // Group boxes own their size from layout; keeping an old measured height collapses the
          // cluster to the title row and members look ungrouped.
          if (node.type === 'impactGroup') {
            return node;
          }
          const { measured } = current.find(({ id }) => id === node.id) ?? {};
          return measured ? { ...node, measured } : node;
        })
      ),
    [laidOutNodes, setNodes]
  );

  const { edges: displayEdges, endpointIds } = useMemo(
    () => applyEdgeHoverHighlight(nodes, edges, hoveredEdgeId),
    [nodes, edges, hoveredEdgeId]
  );

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: { id: string }) => {
    setHoveredEdgeId(edge.id);
  }, []);
  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const endpointSelectors = useMemo(
    () =>
      [...endpointIds]
        .map((id) => {
          const escaped =
            typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
              ? CSS.escape(id)
              : id.replace(/"/g, '\\"');
          return `.react-flow__node[data-id="${escaped}"]`;
        })
        .join(',\n'),
    [endpointIds]
  );

  return (
    <ReactFlowProvider>
      <div
        data-test-subj="impactServiceMap"
        css={css`
          width: 100%;
          height: 100%;
          /* The service map's own grid: plain squares on a light shade. */
          background: linear-gradient(
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
            ${euiTheme.colors.lightShade};
          background-size: ${euiTheme.size.l} ${euiTheme.size.l};
          .react-flow__node {
            cursor: default;
          }
          .react-flow__edge {
            cursor: pointer;
          }
          /* Group boxes sit under their members; the wrapper must not steal their clicks. */
          .react-flow__node-impactGroup {
            pointer-events: none;
          }
          .react-flow__node-impactGroup .impactMapGroupHeader {
            pointer-events: auto;
          }
          .react-flow__edge.${EDGE_HOVERED_CLASS} path {
            filter: drop-shadow(0 0 3px ${euiTheme.colors.primary});
          }
          /* Endpoints via data-id so hover never rewrites the node list (that remount jumped
             nested groups and made the pointer land on a different edge). */
          ${endpointSelectors
            ? `
            .react-flow__node:not(.react-flow__node-impactGroup) {
              opacity: 0.3;
            }
            ${endpointSelectors} {
              opacity: 1;
              filter: drop-shadow(0 0 0.5px ${euiTheme.colors.primary})
                drop-shadow(0 0 4px ${euiTheme.colors.primary});
            }
          `
            : ''}
          ${onEntityClick
            ? `
            .react-flow__node.${CLICKABLE_CLASS},
            .react-flow__node.${CLICKABLE_CLASS} * {
              cursor: pointer;
            }
            .react-flow__node.${CLICKABLE_CLASS}:hover {
              filter: drop-shadow(0 0 0.5px ${euiTheme.colors.primary})
                drop-shadow(0 0 3px ${euiTheme.colors.primary});
            }
          `
            : ''}
        `}
      >
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onNodeClick={onEntityClick ? (_, { id }) => onEntityClick(id) : undefined}
          onEdgeClick={onRelationshipClick ? (_, { id }) => onRelationshipClick(id) : undefined}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          minZoom={0.1}
          maxZoom={3}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          colorMode={colorMode.toLowerCase() as ColorMode}
        >
          <KeepNodesInView nodeIds={nodes.map(({ id }) => id).join('|')} layout={laidOutNodes} />
          <Panel position="top-left">
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <MapControls onToggleFullScreen={onToggleFullScreen} isFullScreen={isFullScreen} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ImpactMapLegend
                  criticalPathColor={criticalPathColor}
                  showInferred={edges.some(({ data }) => data?.inferred)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </Panel>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
