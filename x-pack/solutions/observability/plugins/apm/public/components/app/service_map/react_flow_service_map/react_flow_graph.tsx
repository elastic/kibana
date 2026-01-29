/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import type { FitViewOptions } from '@xyflow/react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import '@xyflow/react/dist/style.css';
import { applyDagreLayout } from './layout';
import { FIT_VIEW_PADDING, FIT_VIEW_DURATION } from './constants';

interface ReactFlowGraphProps {
  height: number;
  nodes: Node[];
  edges: Edge[];
}

const fitViewOptions: FitViewOptions = { padding: FIT_VIEW_PADDING, duration: FIT_VIEW_DURATION };

function ReactFlowGraphInner({
  height,
  nodes: initialNodes,
  edges: initialEdges,
}: ReactFlowGraphProps) {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();

  // Apply layout to nodes - edges already have styling from transformElements
  const layoutedNodes = useMemo(
    () => applyDagreLayout(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when props change
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(initialEdges);

    // Fit view after nodes are updated
    if (layoutedNodes.length > 0) {
      // Small delay to allow React Flow to render nodes first
      requestAnimationFrame(() => {
        fitView(fitViewOptions);
      });
    }
  }, [layoutedNodes, initialEdges, setNodes, setEdges, fitView]);

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
    }),
    [height, euiTheme]
  );

  const onInit = useCallback(() => {
    if (layoutedNodes.length > 0) {
      fitView(fitViewOptions);
    }
  }, [fitView, layoutedNodes.length]);

  return (
    <div css={css(containerStyle)} data-test-subj="reactFlowServiceMap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
        aria-label={i18n.translate('xpack.apm.serviceMap.ariaLabel', {
          defaultMessage:
            'Service map showing {nodeCount} services and dependencies. Use tab or arrow keys to navigate between nodes, enter or space to view details.',
          values: { nodeCount: nodes.length },
        })}
      >
        <Background gap={24} size={1} color={euiTheme.colors.lightShade} />
        <Controls
          showInteractive={false}
          position="top-left"
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border-radius: ${euiTheme.border.radius.medium};
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
          `}
        />
      </ReactFlow>
    </div>
  );
}

export function ReactFlowServiceMap(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
