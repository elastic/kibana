/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, useEuiTheme } from '@elastic/eui';
import type { MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  DEFAULT_NODE_SIZE,
  OFFSCREEN_POSITION,
  EDGE_OFFSET_DIVISOR,
  CENTER_ANIMATION_DURATION_MS,
} from './constants';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
import type { Environment } from '../../../../../common/environment_rt';
import { PopoverContent, type ElementData } from '../popover/popover_content';
import type {
  ServiceMapNode,
  ServiceMapNodeData,
  ServiceNodeData,
  GroupedNodeData,
  ServiceMapEdge,
} from '../../../../../common/service_map';

/**
 * Transforms React Flow node data to the unified ElementData format
 * used by the shared PopoverContent component.
 * This will be removed / adapted when the Cytoscape solution is replaced.
 */
function transformNodeDataForPopover(nodeData: ServiceMapNodeData): ElementData {
  const baseData: ElementData = {
    id: nodeData.id,
    label: nodeData.label,
  };

  if (nodeData.isService) {
    const serviceData = nodeData as ServiceNodeData;
    return {
      ...baseData,
      isService: true,
      [SERVICE_NAME]: nodeData.id,
      serviceAnomalyStats: serviceData.serviceAnomalyStats,
      agentName: serviceData.agentName,
    };
  }

  if ('isGrouped' in nodeData && nodeData.isGrouped) {
    const groupedData = nodeData as GroupedNodeData;
    return {
      ...baseData,
      groupedConnections: groupedData.groupedConnections,
      [SPAN_TYPE]: groupedData.spanType,
      spanType: groupedData.spanType,
    };
  }

  return {
    ...baseData,
    [SPAN_TYPE]: 'spanType' in nodeData ? nodeData.spanType : undefined,
    spanType: 'spanType' in nodeData ? nodeData.spanType : undefined,
  };
}

/**
 * Transforms React Flow edge data to the unified ElementData format
 * used by the shared PopoverContent component (for EdgeContents).
 * This will be removed / adapted when the Cytoscape solution is replaced.
 */
function transformEdgeDataForPopover(edge: ServiceMapEdge): ElementData {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceData: edge.data?.sourceData ?? { id: edge.source },
    targetData: edge.data?.targetData ?? { id: edge.target },
    resources: edge.data?.resources ?? [],
  };
}

interface ReactFlowPopoverProps {
  selectedNode: ServiceMapNode | null;
  selectedEdge: ServiceMapEdge | null;
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onClose: () => void;
}

export function ReactFlowPopover({
  selectedNode,
  selectedEdge,
  focusedServiceName,
  environment,
  kuery,
  start,
  end,
  onClose,
}: ReactFlowPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const popoverRef = useRef<EuiPopover>(null);
  const reactFlowInstance = useReactFlow();

  const nodeData = selectedNode?.data;
  const selectedNodeId = selectedNode?.id;

  // Transform data for popover content - handles both nodes and edges
  const elementData = useMemo(() => {
    if (selectedEdge) {
      return transformEdgeDataForPopover(selectedEdge);
    }
    if (nodeData) {
      return transformNodeDataForPopover(nodeData);
    }
    return null;
  }, [nodeData, selectedEdge]);

  // Calculate popover position - handles both nodes and edges
  // Uses similar positioning logic to Cytoscape: offset upward so the node/edge is visible
  const popoverStyle = useMemo(() => {
    const viewport = reactFlowInstance.getViewport();
    const zoom = viewport.zoom;

    if (selectedEdge) {
      const sourceNode = reactFlowInstance.getNode(selectedEdge.source);
      const targetNode = reactFlowInstance.getNode(selectedEdge.target);

      if (sourceNode?.position && targetNode?.position) {
        const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? DEFAULT_NODE_SIZE;
        const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? DEFAULT_NODE_SIZE;
        const targetWidth = targetNode.measured?.width ?? targetNode.width ?? DEFAULT_NODE_SIZE;
        const targetHeight = targetNode.measured?.height ?? targetNode.height ?? DEFAULT_NODE_SIZE;

        const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
        const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
        const targetCenterX = targetNode.position.x + targetWidth / 2;
        const targetCenterY = targetNode.position.y + targetHeight / 2;

        const midX = (sourceCenterX + targetCenterX) / 2;
        const midY = (sourceCenterY + targetCenterY) / 2;

        // Convert to screen coordinates with upward offset (like Cytoscape)
        const x = midX * zoom + viewport.x;
        const avgHeight = (sourceHeight + targetHeight) / 2;
        const offsetY = ((zoom + 1) * avgHeight) / EDGE_OFFSET_DIVISOR;
        const y = midY * zoom + viewport.y - offsetY;

        return {
          position: 'absolute' as const,
          left: x,
          top: y,
        };
      }
    }

    if (selectedNode?.position) {
      const fullNode = reactFlowInstance.getNode(selectedNode.id);
      const nodeWidth = fullNode?.measured?.width ?? fullNode?.width ?? DEFAULT_NODE_SIZE;

      const centerX = selectedNode.position.x + nodeWidth / 2;

      const x = centerX * zoom + viewport.x;
      // Position popover so node icon is partially visible (like Cytoscape)
      const topY = selectedNode.position.y;
      const y = topY * zoom + viewport.y;

      return {
        position: 'absolute' as const,
        left: x,
        top: y,
      };
    }

    return {
      position: 'absolute' as const,
      left: OFFSCREEN_POSITION,
      top: OFFSCREEN_POSITION,
    };
  }, [selectedNode, selectedEdge, reactFlowInstance]);

  useEffect(() => {
    if (popoverRef.current && (selectedNode || selectedEdge)) {
      popoverRef.current.positionPopoverFluid();
    }
  }, [selectedNode, selectedEdge]);

  const centerSelectedNode = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (selectedNode) {
        reactFlowInstance.setCenter(selectedNode.position.x, selectedNode.position.y, {
          zoom: reactFlowInstance.getZoom(),
          duration: CENTER_ANIMATION_DURATION_MS,
        });
      }
    },
    [reactFlowInstance, selectedNode]
  );

  const isAlreadyFocused = focusedServiceName === selectedNodeId;

  const onFocusClick = isAlreadyFocused
    ? centerSelectedNode
    : (_event: MouseEvent<HTMLAnchorElement>) => onClose();

  const isOpen = (!!selectedNode || !!selectedEdge) && !!elementData;

  const displayElementId = selectedEdge
    ? `${selectedEdge.source} → ${selectedEdge.target}`
    : selectedNodeId ?? '';

  const trigger = <div style={{ width: 1, height: 1, visibility: 'hidden' }} />;

  return (
    <div style={popoverStyle} role="presentation">
      <EuiPopover
        anchorPosition="upCenter"
        button={trigger}
        closePopover={onClose}
        isOpen={isOpen}
        ref={popoverRef}
        zIndex={Number(euiTheme.levels.menu)}
        data-test-subj="serviceMapPopover"
      >
        {elementData && (
          <PopoverContent
            elementData={elementData}
            elementId={displayElementId}
            environment={environment}
            kuery={kuery}
            start={start}
            end={end}
            onFocusClick={onFocusClick}
            excludeEdges={false}
          />
        )}
      </EuiPopover>
    </div>
  );
}
