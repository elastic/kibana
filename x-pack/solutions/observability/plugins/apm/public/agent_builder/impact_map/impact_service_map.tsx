/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type ColorMode,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import '@xyflow/react/dist/style.css';
import type { ImpactMapRendererProps } from '@kbn/agentic-investigations-plugin/public';
import { getSeverityColor } from '../../../common/anomaly_detection';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getApmInternalServices } from '../../plugin';
import { ServiceNode } from '../../components/shared/service_map/service_node';
import { DiamondNode } from '../../components/shared/service_map/diamond_node';
import { applyDagreLayout } from '../../components/shared/service_map/layout';
import {
  IMPACT_SEVERITY_SCORES,
  transformImpactMap,
  type ImpactDependencyNodeData,
  type ImpactServiceMapNode,
} from './transform_impact_map';

const ImpactDependencyNode = memo(
  ({ data, sourcePosition, targetPosition }: NodeProps<Node<ImpactDependencyNodeData>>) => (
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
  )
);
ImpactDependencyNode.displayName = 'ImpactDependencyNode';

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  impactDependency: ImpactDependencyNode,
};

const LEGEND = {
  rootCause: i18n.translate('xpack.apm.impactMap.legend.rootCause', {
    defaultMessage: 'Root cause or critical',
  }),
  symptom: i18n.translate('xpack.apm.impactMap.legend.symptom', {
    defaultMessage: 'Symptom or degraded',
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
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder data-test-subj="impactServiceMapLegend">
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={getSeverityColor(IMPACT_SEVERITY_SCORES.rootCause)}>
            <EuiText size="xs">{LEGEND.rootCause}</EuiText>
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color={getSeverityColor(IMPACT_SEVERITY_SCORES.symptom)}>
            <EuiText size="xs">{LEGEND.symptom}</EuiText>
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color={getSeverityColor(IMPACT_SEVERITY_SCORES.impacted)}>
            <EuiText size="xs">{LEGEND.impacted}</EuiText>
          </EuiHealth>
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

/**
 * The APM agent name of each service entity that has traces, so it draws with the same icon as on
 * the service map. A service APM knows nothing about keeps the map's own icon, or none.
 */
const useServiceAgentNames = (impactMap: ImpactMapRendererProps['impactMap']) => {
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const serviceIds = useMemo(() => {
    const dependencyTypes = new Set(
      impactMap.entity_types.filter(({ kind }) => kind === 'dependency').map(({ id }) => id)
    );
    return impactMap.entities.filter(({ type_id: t }) => !dependencyTypes.has(t)).map(({ id }) => id);
  }, [impactMap]);

  useEffect(() => {
    const callApmApi = getApmInternalServices()?.callApmApi;
    if (!callApmApi) {
      return;
    }
    let cancelled = false;
    const end = new Date();
    const start = new Date(end.getTime() - LOOKBACK_MS);
    Promise.all(
      serviceIds.map((serviceName) =>
        callApmApi('GET /internal/apm/services/{serviceName}/agent', {
          params: {
            path: { serviceName },
            query: {
              environment: ENVIRONMENT_ALL.value,
              start: start.toISOString(),
              end: end.toISOString(),
            },
          },
        })
          .then(({ agentName }) => (agentName ? ([serviceName, agentName] as const) : undefined))
          .catch(() => undefined)
      )
    ).then((found) => {
      if (!cancelled) {
        setAgentNames(Object.fromEntries(found.filter((pair) => pair !== undefined)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serviceIds]);

  return agentNames;
};

/**
 * Draws an investigation's impact map with the service map's nodes and layout. Users can pan,
 * zoom and drag nodes; nodes do not open anything yet.
 */
export function ImpactServiceMap({ impactMap }: ImpactMapRendererProps) {
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
        `}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={3}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          colorMode={colorMode.toLowerCase() as ColorMode}
        >
          <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
          <Controls showInteractive={false} />
          <Panel position="top-right">
            <ImpactMapLegend criticalPathColor={criticalPathColor} />
          </Panel>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
