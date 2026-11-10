/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiPortal, useEuiTheme } from '@elastic/eui';
import type { MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactFlowInstance, Viewport } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import { DEFAULT_NODE_SIZE, OFFSCREEN_POSITION, CENTER_ANIMATION_DURATION_MS } from './constants';
import type { Environment } from '../../../../common/environment_rt';
import { PopoverContent } from './popover/popover_content';
import type { ServiceMapNode } from '../../../../common/service_map';
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
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onClose: () => void;
  /** When true, hides navigation actions like "Focus map" that don't apply in dashboard embeds. */
  isEmbedded?: boolean;
  /** Optional override for the Focus map button visibility. Defaults to `!isEmbedded`. */
  showFocusMap?: boolean;
  /** Focus button always navigates, even for the currently focused service (default re-centers). */
  alwaysNavigateOnFocus?: boolean;
  /** Strip `kuery` from popover-built URLs (env still flows through). */
  clearKueryOnNavigation?: boolean;
}

export function MapPopover({
  selectedNode,
  focusedServiceName,
  environment,
  kuery,
  start,
  end,
  onClose,
  isEmbedded,
  showFocusMap,
  alwaysNavigateOnFocus,
  clearKueryOnNavigation,
}: MapPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const popoverRef = useRef<EuiPopover>(null);
  const reactFlowInstance = useReactFlow();
  const [diagnosticFlyoutSelection, setDiagnosticFlyoutSelection] = useState<ServiceMapNode | null>(
    null
  );

  const handleOpenDiagnostic = useCallback(() => {
    if (selectedNode) {
      setDiagnosticFlyoutSelection(selectedNode);
      onClose();
    }
  }, [selectedNode, onClose]);

  const selectedNodeId = selectedNode?.id;

  // Calculate popover position for the selected node
  const popoverStyle = useMemo(() => {
    const viewport = reactFlowInstance.getViewport();

    if (selectedNode) {
      return getNodePopoverPosition(selectedNode, reactFlowInstance, viewport);
    }

    return OFFSCREEN_STYLE;
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
          duration: CENTER_ANIMATION_DURATION_MS,
        });
      }
    },
    [reactFlowInstance, selectedNode]
  );

  const isAlreadyFocused = focusedServiceName === selectedNodeId;

  const onFocusClick =
    isAlreadyFocused && !alwaysNavigateOnFocus
      ? centerSelectedNode
      : (_event: MouseEvent<HTMLAnchorElement>) => onClose();

  const isOpen = !!selectedNode;

  const trigger = <div style={{ width: 1, height: 1, visibility: 'hidden' }} aria-hidden="true" />;

  // Build accessible label for the popover
  const popoverAriaLabel = useMemo(() => {
    if (selectedNode) {
      return i18n.translate('xpack.apm.serviceMap.popover.nodeAriaLabel', {
        defaultMessage: 'Details for {nodeName}. Press Escape to close.',
        values: { nodeName: selectedNode.data.label ?? selectedNode.id },
      });
    }
    return '';
  }, [selectedNode]);

  return (
    <div style={popoverStyle} role="presentation" aria-hidden={!isOpen}>
      <EuiPopover
        anchorPosition="upCenter"
        button={trigger}
        closePopover={onClose}
        isOpen={isOpen}
        ref={popoverRef}
        // Below EUI flyouts so nested SLO / alert flyouts stay on top; above map canvas (content).
        zIndex={Number(euiTheme.levels.flyout) - 1}
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
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          onFocusClick={onFocusClick}
          onOpenDiagnostic={handleOpenDiagnostic}
          isEmbedded={isEmbedded}
          showFocusMap={showFocusMap}
          clearKueryOnNavigation={clearKueryOnNavigation}
        />
      </EuiPopover>
      {diagnosticFlyoutSelection && (
        <>
          <EuiPortal>
            <div
              role="presentation"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: Number(euiTheme.levels.header),
                cursor: 'default',
              }}
              onClick={() => setDiagnosticFlyoutSelection(null)}
            />
          </EuiPortal>
          <DiagnosticFlyout
            selection={diagnosticFlyoutSelection}
            isOpen
            onClose={() => setDiagnosticFlyoutSelection(null)}
          />
        </>
      )}
    </div>
  );
}
