/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import type { MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
import type { Environment } from '../../../../../common/environment_rt';
import { PopoverContent, type ElementData } from '../popover/popover_content';
import type {
  ServiceMapNode,
  ServiceMapNodeData,
  ServiceNodeData,
  GroupedNodeData,
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

interface ReactFlowPopoverProps {
  selectedNode: ServiceMapNode | null;
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onClose: () => void;
}

export function ReactFlowPopover({
  selectedNode,
  focusedServiceName,
  environment,
  kuery,
  start,
  end,
  onClose,
}: ReactFlowPopoverProps) {
  const popoverRef = useRef<EuiPopover>(null);
  const reactFlowInstance = useReactFlow();

  const nodeData = selectedNode?.data;
  const selectedNodeId = selectedNode?.id;

  const elementData = useMemo(() => {
    if (!nodeData) return null;
    return transformNodeDataForPopover(nodeData);
  }, [nodeData]);

  const popoverStyle = useMemo(() => {
    if (!selectedNode || !selectedNode.position) {
      return {
        position: 'absolute' as const,
        left: -10000,
        top: -10000,
      };
    }

    const fullNode = reactFlowInstance.getNode(selectedNode.id);
    const nodeWidth = fullNode?.measured?.width ?? fullNode?.width ?? 56;
    const nodeHeight = fullNode?.measured?.height ?? fullNode?.height ?? 56;

    const viewport = reactFlowInstance.getViewport();

    const x = (selectedNode.position.x + nodeWidth / 2) * viewport.zoom + viewport.x;
    const y = (selectedNode.position.y + nodeHeight / 2) * viewport.zoom + viewport.y;

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
    };
  }, [selectedNode, reactFlowInstance]);

  useEffect(() => {
    if (popoverRef.current && selectedNode) {
      popoverRef.current.positionPopoverFluid();
    }
  }, [selectedNode]);

  const centerSelectedNode = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (selectedNode) {
        reactFlowInstance.setCenter(selectedNode.position.x, selectedNode.position.y, {
          zoom: reactFlowInstance.getZoom(),
          duration: 200,
        });
      }
    },
    [reactFlowInstance, selectedNode]
  );

  const isAlreadyFocused = focusedServiceName === selectedNodeId;

  const onFocusClick = isAlreadyFocused
    ? centerSelectedNode
    : (_event: MouseEvent<HTMLAnchorElement>) => onClose();

  const isOpen = !!selectedNode && !!elementData;

  const trigger = <div style={{ width: 1, height: 1, visibility: 'hidden' }} />;

  return (
    <div style={popoverStyle} role="presentation">
      <EuiPopover
        anchorPosition="upCenter"
        button={trigger}
        closePopover={onClose}
        isOpen={isOpen}
        ref={popoverRef}
        zIndex={1000}
        data-test-subj="serviceMapPopover"
      >
        {elementData && (
          <PopoverContent
            elementData={elementData}
            elementId={selectedNodeId ?? ''}
            environment={environment}
            kuery={kuery}
            start={start}
            end={end}
            onFocusClick={onFocusClick}
            excludeEdges={true}
          />
        )}
      </EuiPopover>
    </div>
  );
}
