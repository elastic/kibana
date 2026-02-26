/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, useEuiTheme } from '@elastic/eui';
import type { MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactFlowInstance, Viewport } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_NODE_SIZE,
  OFFSCREEN_POSITION,
  EDGE_OFFSET_DIVISOR,
  CENTER_ANIMATION_DURATION_MS,
} from './constants';
import type { Environment } from '../../../../common/environment_rt';
import { PopoverContent, type ServiceMapSelection } from './popover/popover_content';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import { DiagnosticFlyout } from './diagnostic_tool/diagnostic_flyout';

interface PopoverPosition {
  position: 'absolute';
  left: number;
  top: number;
}

const OFFSCREEN_STYLE: PopoverPosition = {
  position: 'absolute',
  left: OFFSCREEN_POSITION,
  top: OFFSCREEN_POSITION,
};

/**
 * Calculates the popover position for an edge (at the midpoint between source and target nodes).
 * Returns offscreen position if source or target nodes cannot be found.
 */
function getEdgePopoverPosition(
  edge: ServiceMapEdge,
  reactFlowInstance: ReactFlowInstance,
  viewport: Viewport
): PopoverPosition {
  const sourceNode = reactFlowInstance.getNode(edge.source);
  const targetNode = reactFlowInstance.getNode(edge.target);

  if (!sourceNode?.position || !targetNode?.position) {
    return OFFSCREEN_STYLE;
  }

  const zoom = viewport.zoom;

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

  const x = midX * zoom + viewport.x;
  const avgHeight = (sourceHeight + targetHeight) / 2;
  const offsetY = ((zoom + 1) * avgHeight) / EDGE_OFFSET_DIVISOR;
  const y = midY * zoom + viewport.y - offsetY;

  return {
    position: 'absolute',
    left: x,
    top: y,
  };
}

/**
 * Calculates the popover position for a node (centered horizontally, positioned at top of node).
 * Returns offscreen position if node position is not available.
 */
function getNodePopoverPosition(
  node: ServiceMapNode,
  reactFlowInstance: ReactFlowInstance,
  viewport: Viewport
): PopoverPosition {
  if (!node.position) {
    return OFFSCREEN_STYLE;
  }

  const zoom = viewport.zoom;
  const fullNode = reactFlowInstance.getNode(node.id);
  const nodeWidth = fullNode?.measured?.width ?? fullNode?.width ?? DEFAULT_NODE_SIZE;

  const centerX = node.position.x + nodeWidth / 2;
  const x = centerX * zoom + viewport.x;

  const topY = node.position.y;
  const y = topY * zoom + viewport.y;

  return {
    position: 'absolute',
    left: x,
    top: y,
  };
}

interface MapPopoverProps {
  selectedNode: ServiceMapNode | null;
  selectedEdge: ServiceMapEdge | null;
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onClose: () => void;
}

export function MapPopover({
  selectedNode,
  selectedEdge,
  focusedServiceName,
  environment,
  kuery,
  start,
  end,
  onClose,
}: MapPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const popoverRef = useRef<EuiPopover>(null);
  const reactFlowInstance = useReactFlow();
  const [diagnosticFlyoutSelection, setDiagnosticFlyoutSelection] =
    useState<ServiceMapSelection | null>(null);

  const handleOpenDiagnostic = useCallback(() => {
    const selection: ServiceMapSelection | null = selectedEdge ?? selectedNode;
    if (selection) {
      setDiagnosticFlyoutSelection(selection);
      onClose();
    }
  }, [selectedNode, selectedEdge, onClose]);

  const selectedNodeId = selectedNode?.id;

  // Calculate popover position using dedicated helper functions
  const popoverStyle = useMemo(() => {
    const viewport = reactFlowInstance.getViewport();

    if (selectedEdge) {
      return getEdgePopoverPosition(selectedEdge, reactFlowInstance, viewport);
    }

    if (selectedNode) {
      return getNodePopoverPosition(selectedNode, reactFlowInstance, viewport);
    }

    return OFFSCREEN_STYLE;
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

  const isOpen = !!selectedNode || !!selectedEdge;

  const trigger = <div style={{ width: 1, height: 1, visibility: 'hidden' }} aria-hidden="true" />;

  // Build accessible label for the popover
  const popoverAriaLabel = useMemo(() => {
    if (selectedEdge) {
      return i18n.translate('xpack.apm.serviceMap.popover.edgeAriaLabel', {
        defaultMessage: 'Details for connection from {source} to {target}. Press Escape to close.',
        values: {
          source: selectedEdge.data?.sourceLabel ?? selectedEdge.source,
          target: selectedEdge.data?.targetLabel ?? selectedEdge.target,
        },
      });
    }
    if (selectedNode) {
      return i18n.translate('xpack.apm.serviceMap.popover.nodeAriaLabel', {
        defaultMessage: 'Details for {nodeName}. Press Escape to close.',
        values: { nodeName: selectedNode.data.label ?? selectedNode.id },
      });
    }
    return '';
  }, [selectedNode, selectedEdge]);

  return (
    <div style={popoverStyle} role="presentation" aria-hidden={!isOpen}>
      <EuiPopover
        anchorPosition="upCenter"
        button={trigger}
        closePopover={onClose}
        isOpen={isOpen}
        ref={popoverRef}
        zIndex={Number(euiTheme.levels.menu)}
        data-test-subj="serviceMapPopover"
        aria-label={popoverAriaLabel}
        panelProps={{
          'aria-live': 'polite',
          role: 'dialog',
          'aria-modal': 'false',
        }}
      >
        <PopoverContent
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          onFocusClick={onFocusClick}
          onOpenDiagnostic={handleOpenDiagnostic}
        />
      </EuiPopover>
      {diagnosticFlyoutSelection && (
        <DiagnosticFlyout
          selection={diagnosticFlyoutSelection}
          isOpen
          onClose={() => setDiagnosticFlyoutSelection(null)}
        />
      )}
    </div>
  );
}
