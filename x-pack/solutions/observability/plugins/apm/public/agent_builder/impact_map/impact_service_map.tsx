/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, type ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
  type ColorMode,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import {
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
import { ServiceNode } from '../../components/shared/service_map/service_node';
import { DiamondNode } from '../../components/shared/service_map/diamond_node';
import { applyDagreLayout } from '../../components/shared/service_map/layout';
import {
  IMPACT_SEVERITY_SCORES,
  transformImpactMap,
  type ImpactDependencyNodeData,
  type ImpactServiceNodeData,
  type ImpactState,
  type ImpactServiceMapNode,
} from './transform_impact_map';

const BADGES: Record<ImpactState, { icon: IconType; score: number; label: string }> = {
  root_cause: {
    icon: 'bullseye',
    score: IMPACT_SEVERITY_SCORES.rootCause,
    label: i18n.translate('xpack.apm.impactMap.badge.rootCause', {
      defaultMessage: 'Root cause',
    }),
  },
  symptom: {
    icon: 'warning',
    score: IMPACT_SEVERITY_SCORES.symptom,
    label: i18n.translate('xpack.apm.impactMap.badge.symptom', {
      defaultMessage: 'Symptom: where the problem shows',
    }),
  },
  impacted: {
    icon: 'sortDown',
    score: IMPACT_SEVERITY_SCORES.impacted,
    label: i18n.translate('xpack.apm.impactMap.badge.impacted', {
      defaultMessage: 'Impacted',
    }),
  },
};

const BADGE_SIZE = 22;

function StateBadge({ state, floating }: { state: ImpactState; floating?: boolean }) {
  const { euiTheme } = useEuiTheme();
  const { icon, score, label } = BADGES[state];
  return (
    <EuiToolTip
      content={<EuiText size="xs">{label}</EuiText>}
      position="top"
      disableScreenReaderOutput
    >
      <span
        role="img"
        tabIndex={0}
        aria-label={label}
        data-test-subj={`impactMapBadge-${state}`}
        css={css`
          ${floating ? 'position: absolute; top: -8px; left: calc(50% + 14px);' : ''}
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
    >
      <span
        role="img"
        tabIndex={0}
        aria-label={label}
        data-test-subj="impactMapEventCount"
        css={css`
          position: absolute;
          top: -8px;
          right: calc(50% + 14px);
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
  <>
    <ServiceNode {...(props as unknown as ComponentProps<typeof ServiceNode>)} />
    {props.data.impactState && <StateBadge state={props.data.impactState} floating />}
    <EventCountBadge count={props.data.eventCount} />
  </>
));
ImpactServiceNode.displayName = 'ImpactServiceNode';

const ImpactDependencyNode = memo(
  ({ data, sourcePosition, targetPosition }: NodeProps<Node<ImpactDependencyNodeData>>) => (
    <>
      <DiamondNode
        id={data.id}
        label={data.label}
        spanType={data.spanType}
        spanSubtype={data.spanSubtype}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        testSubjPrefix="impactDependency"
        iconAltFallback="dependency"
        borderColor={
          data.severityScore !== undefined ? getSeverityColor(data.severityScore) : undefined
        }
      />
      {data.impactState && <StateBadge state={data.impactState} floating />}
      <EventCountBadge count={data.eventCount} />
    </>
  )
);
ImpactDependencyNode.displayName = 'ImpactDependencyNode';

const ImpactInfrastructureNode = memo((props: NodeProps<Node<ImpactDependencyNodeData>>) => (
  <>
    <InfrastructureNode {...props} />
    {props.data.impactState && <StateBadge state={props.data.impactState} floating />}
    <EventCountBadge count={props.data.eventCount} />
  </>
));
ImpactInfrastructureNode.displayName = 'ImpactInfrastructureNode';

const nodeTypes: NodeTypes = {
  impactInfrastructure: ImpactInfrastructureNode,
  service: ImpactServiceNode,
  impactDependency: ImpactDependencyNode,
};

const LEGEND = {
  rootCause: i18n.translate('xpack.apm.impactMap.legend.rootCause', {
    defaultMessage: 'Root cause',
  }),
  symptom: i18n.translate('xpack.apm.impactMap.legend.symptom', {
    defaultMessage: 'Symptom',
  }),
  impacted: i18n.translate('xpack.apm.impactMap.legend.impacted', {
    defaultMessage: 'Impacted',
  }),
  criticalPath: i18n.translate('xpack.apm.impactMap.legend.criticalPath', {
    defaultMessage: 'Critical path',
  }),
};

function ImpactMapLegend({ criticalPathColor }: { criticalPathColor: string }) {
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
            <StateBadge state="symptom" />
            <EuiText size="xs">{LEGEND.symptom}</EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <StateBadge state="impacted" />
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
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** What APM said about a service, kept for the session so reopening a map draws at once. */
const agentNameCache = new Map<string, string | null>();

/**
 * The APM agent name of each service entity that has traces, so it draws with the same icon as on
 * the service map. A type that already names its agent needs no lookup, a service seen before is
 * answered from the cache, and each answer is drawn as it arrives instead of after the slowest.
 */
const useServiceAgentNames = (impactMap: ImpactMapRendererProps['impactMap']) => {
  const serviceIds = useMemo(() => {
    const knownTypes = new Set(
      impactMap.entity_types
        .filter(({ kind, icon }) => kind !== 'service' || icon?.agent_name)
        .map(({ id }) => id)
    );
    return impactMap.entities.filter(({ type_id: t }) => !knownTypes.has(t)).map(({ id }) => id);
  }, [impactMap]);

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
    const controller = new AbortController();
    const end = new Date();
    const start = new Date(end.getTime() - LOOKBACK_MS);
    missing.forEach((serviceName) => {
      callApmApi('GET /internal/apm/services/{serviceName}/agent', {
        signal: controller.signal,
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
          if (agentName && !controller.signal.aborted) {
            setAgentNames((current) => ({ ...current, [serviceName]: agentName }));
          }
        },
        () => undefined
      );
    });
    return () => {
      controller.abort();
    };
  }, [serviceIds, fromCache]);

  return agentNames;
};

/**
 * Keeps every node in view. The map is drawn inside a flyout that animates open and resizes, and
 * a fit done before the size settles, or before nodes are measured, leaves the nodes off screen.
 * So it fits again whenever the container's size or the set of nodes changes.
 */
function FitViewOnChange({ nodeIds }: { nodeIds: string }) {
  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();
  const size = useStore(({ width, height }) => `${width}x${height}`);
  useEffect(() => {
    if (!initialized || size.startsWith('0x') || size.endsWith('x0')) {
      return;
    }
    const frame = requestAnimationFrame(() => fitView({ padding: 0.12, maxZoom: 1.5 }));
    return () => cancelAnimationFrame(frame);
  }, [initialized, size, nodeIds, fitView]);
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
}: ImpactMapRendererProps) {
  const { euiTheme, colorMode } = useEuiTheme();
  const criticalPathColor = euiTheme.colors.danger;

  const agentNames = useServiceAgentNames(impactMap);

  const { laidOutNodes, edges } = useMemo(() => {
    const graph = transformImpactMap(impactMap, { criticalPath: criticalPathColor }, agentNames);
    return {
      laidOutNodes: applyDagreLayout<ImpactServiceMapNode>(graph.nodes, graph.edges),
      edges: graph.edges,
    };
  }, [impactMap, criticalPathColor, agentNames]);

  // Local state so a dragged node stays put; a revised map from the agent lays out afresh.
  const [nodes, setNodes, onNodesChange] = useNodesState<ImpactServiceMapNode>(laidOutNodes);
  useEffect(() => setNodes(laidOutNodes), [laidOutNodes, setNodes]);

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
          ${onEntityClick ? '.react-flow__node { cursor: pointer; }' : ''}
          ${onRelationshipClick ? '.react-flow__edge { cursor: pointer; }' : ''}
        `}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={onEntityClick ? (_, { id }) => onEntityClick(id) : undefined}
          onEdgeClick={onRelationshipClick ? (_, { id }) => onRelationshipClick(id) : undefined}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12, maxZoom: 1.5 }}
          minZoom={0.1}
          maxZoom={3}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          colorMode={colorMode.toLowerCase() as ColorMode}
        >
          <FitViewOnChange nodeIds={nodes.map(({ id }) => id).join('|')} />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            <ImpactMapLegend criticalPathColor={criticalPathColor} />
          </Panel>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
