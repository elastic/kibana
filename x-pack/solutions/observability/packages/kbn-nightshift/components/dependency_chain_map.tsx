/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  type ColorMode,
} from '@xyflow/react';
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import Dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import type { DependencyEdgeItem, CauseKiItem } from './significant_event_detail_body';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;

interface ServiceNodeData extends Record<string, unknown> {
  label: string;
  isCause: boolean;
  isExposed: boolean;
}

type ServiceFlowNode = Node<ServiceNodeData>;

const ServiceMapNode = memo(
  ({ data, sourcePosition, targetPosition }: NodeProps<ServiceFlowNode>) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = data.isCause
      ? euiTheme.colors.severity.danger
      : data.isExposed
      ? euiTheme.colors.severity.risk
      : euiTheme.colors.borderBaseSubdued;

    return (
      <>
        <Handle
          type="target"
          position={targetPosition ?? Position.Left}
          style={{ visibility: 'hidden' }}
        />
        <div
          css={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: ${NODE_WIDTH}px;
            height: ${NODE_HEIGHT}px;
            border: 2px solid ${borderColor};
            border-radius: ${euiTheme.border.radius.medium};
            background: ${euiTheme.colors.backgroundBasePlain};
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            gap: 2px;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <span>{data.label}</span>
          </EuiText>
          {data.isCause ? (
            <EuiBadge
              color="danger"
              css={css`
                font-size: 9px;
              `}
            >
              {i18n.translate('xpack.nightshift.serviceMapNode.rootCauseBadgeLabel', {
                defaultMessage: 'root cause',
              })}
            </EuiBadge>
          ) : data.isExposed ? (
            <EuiBadge
              color="warning"
              css={css`
                font-size: 9px;
              `}
            >
              {i18n.translate('xpack.nightshift.serviceMapNode.exposedBadgeLabel', {
                defaultMessage: 'exposed',
              })}
            </EuiBadge>
          ) : null}
        </div>
        <Handle
          type="source"
          position={sourcePosition ?? Position.Right}
          style={{ visibility: 'hidden' }}
        />
      </>
    );
  }
);

ServiceMapNode.displayName = 'ServiceMapNode';

const nodeTypes: NodeTypes = {
  service: ServiceMapNode,
};

function applyLayout(nodes: ServiceFlowNode[], edges: Edge[]): ServiceFlowNode[] {
  if (nodes.length === 0) return nodes;

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'LR',
      ranksep: 80,
      nodesep: 40,
      marginx: 20,
      marginy: 20,
    })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  try {
    Dagre.layout(g);
  } catch {
    // Grid fallback
    const cols = Math.ceil(Math.sqrt(nodes.length));
    return nodes.map((node, i) => ({
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x: (i % cols) * (NODE_WIDTH + 80) + 20,
        y: Math.floor(i / cols) * (NODE_HEIGHT + 40) + 20,
      },
    }));
  }

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: dagreNode
        ? {
            x: Math.round(dagreNode.x - NODE_WIDTH / 2),
            y: Math.round(dagreNode.y - NODE_HEIGHT / 2),
          }
        : { x: 0, y: 0 },
    };
  });
}

export interface DependencyChainMapProps {
  dependencyEdges: DependencyEdgeItem[];
  causeKis: CauseKiItem[];
}

/**
 * Checks whether a cause_ki name refers to the same service as an edge node name.
 * Handles cases like "payment" vs "payment-service" or "payment-svc".
 */
function isSameEntity(edgeNodeName: string, causeKiName: string): boolean {
  if (edgeNodeName === causeKiName) return true;
  const edgeLower = edgeNodeName.toLowerCase();
  const causeLower = causeKiName.toLowerCase();
  // "payment-service" starts with "payment"
  if (causeLower.startsWith(edgeLower + '-') || causeLower.startsWith(edgeLower + '_')) return true;
  // "payment" starts with "pay" — but only match when edge name is a full segment
  if (edgeLower.startsWith(causeLower + '-') || edgeLower.startsWith(causeLower + '_')) return true;
  return false;
}

export function DependencyChainMap({ dependencyEdges, causeKis }: DependencyChainMapProps) {
  const { euiTheme, colorMode } = useEuiTheme();

  const exposedSources = useMemo(
    () => new Set(dependencyEdges.filter((e) => e.exposure === 'exposed').map((e) => e.source)),
    [dependencyEdges]
  );

  const { nodes, edges } = useMemo(() => {
    const nodesMap = new Map<string, ServiceFlowNode>();

    // Collect all node names from edges first
    const edgeNodeNames = new Set<string>();
    for (const edge of dependencyEdges) {
      edgeNodeNames.add(edge.source);
      edgeNodeNames.add(edge.target);
    }

    // Build a mapping from cause_ki names to their matching edge node (or themselves)
    const causeMatchedNodes = new Set<string>();
    for (const ki of causeKis) {
      if (edgeNodeNames.has(ki.name)) {
        causeMatchedNodes.add(ki.name);
      } else {
        // Try fuzzy match: "payment-service" should match "payment"
        for (const edgeName of edgeNodeNames) {
          if (isSameEntity(edgeName, ki.name)) {
            causeMatchedNodes.add(edgeName);
            break;
          }
        }
      }
    }

    for (const edge of dependencyEdges) {
      for (const name of [edge.source, edge.target]) {
        if (!nodesMap.has(name)) {
          nodesMap.set(name, {
            id: name,
            type: 'service',
            position: { x: 0, y: 0 },
            data: {
              label: name,
              isCause: causeMatchedNodes.has(name),
              isExposed: exposedSources.has(name),
            },
          });
        }
      }
    }

    // Add cause nodes only if they have NO match in edges at all
    for (const ki of causeKis) {
      const hasExactMatch = edgeNodeNames.has(ki.name);
      const hasFuzzyMatch = [...edgeNodeNames].some((n) => isSameEntity(n, ki.name));
      if (!hasExactMatch && !hasFuzzyMatch) {
        nodesMap.set(ki.name, {
          id: ki.name,
          type: 'service',
          position: { x: 0, y: 0 },
          data: {
            label: ki.name,
            isCause: true,
            isExposed: false,
          },
        });
      }
    }

    const flowEdges: Edge[] = dependencyEdges.map((edge) => ({
      id: `${edge.source}~${edge.target}`,
      source: edge.source,
      target: edge.target,
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      label: edge.protocol,
      style: {
        strokeWidth: 1.5,
        stroke:
          edge.exposure === 'exposed'
            ? euiTheme.colors.severity.danger
            : euiTheme.colors.borderBaseSubdued,
      },
      labelStyle: { fontSize: 10, fill: euiTheme.colors.textSubdued },
    }));

    const rawNodes = [...nodesMap.values()];
    const layoutedNodes = applyLayout(rawNodes, flowEdges);

    return { nodes: layoutedNodes, edges: flowEdges };
  }, [dependencyEdges, causeKis, exposedSources, euiTheme]);

  // Compute height based on the number of rows
  const graphHeight = useMemo(() => {
    if (nodes.length === 0) return 120;
    const maxY = Math.max(...nodes.map((n) => n.position.y));
    return Math.max(120, maxY + NODE_HEIGHT + 40);
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <ReactFlowProvider>
      <div
        css={css`
          width: 100%;
          height: ${graphHeight}px;

          .react-flow__node,
          .react-flow__node * {
            cursor: default !important;
          }

          .react-flow {
            background: transparent !important;
          }
        `}
        data-test-subj="sigeventsDependencyChainMap"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          colorMode={colorMode.toLowerCase() as ColorMode}
        />
      </div>
    </ReactFlowProvider>
  );
}
