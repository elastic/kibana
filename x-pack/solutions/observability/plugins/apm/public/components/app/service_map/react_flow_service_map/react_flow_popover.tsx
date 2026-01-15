/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import type { MouseEvent } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useReactFlow, type Node } from '@xyflow/react';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
import type { Environment } from '../../../../../common/environment_rt';
import { popoverWidth } from '../cytoscape_options';
import { DependencyContents } from '../popover/dependency_contents';
import { ExternalsListContents } from '../popover/externals_list_contents';
import { ResourceContents } from '../popover/resource_contents';
import { ServiceContents } from '../popover/service_contents';
import { withDiagnoseButton } from '../popover/with_diagnose_button';
import { DiagnosticFlyout } from '../diagnostic_tool/diagnostic_flyout';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import type { ServiceMapNodeData } from './service_node';

function getContentsComponent(
  selectedNodeData: Partial<ServiceMapNodeData> & Record<string, any>,
  isDiagnosticModeEnabled: boolean
) {
  if (selectedNodeData.groupedConnections && Array.isArray(selectedNodeData.groupedConnections)) {
    return ExternalsListContents;
  }
  if (selectedNodeData[SERVICE_NAME] || selectedNodeData.isService) {
    return isDiagnosticModeEnabled ? withDiagnoseButton(ServiceContents) : ServiceContents;
  }
  if (selectedNodeData[SPAN_TYPE] === 'resource') {
    return ResourceContents;
  }

  if (selectedNodeData.label && !selectedNodeData.isService) {
    return DependencyContents;
  }

  return null;
}

interface ReactFlowPopoverProps {
  selectedNode: Node<ServiceMapNodeData> | null;
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
  const { core } = useApmPluginContext();
  const isDiagnosticModeEnabled = core.uiSettings.get(enableDiagnosticMode);
  const [isDiagnosticFlyoutOpen, setIsDiagnosticFlyoutOpen] = useState(false);
  const popoverRef = useRef<EuiPopover>(null);
  const reactFlowInstance = useReactFlow();

  const selectedNodeData = (selectedNode?.data ?? {}) as Partial<ServiceMapNodeData> &
    Record<string, any>;
  const selectedNodeId = selectedNode?.id;

  // Calculate popover position
  const popoverStyle = React.useMemo(() => {
    if (!selectedNode || !selectedNode.position) {
      return {
        position: 'absolute' as const,
        left: -10000,
        top: -10000,
      };
    }

    // Get the full node with measured dimensions from React Flow
    const fullNode = reactFlowInstance.getNode(selectedNode.id);
    const nodeWidth = fullNode?.measured?.width ?? fullNode?.width ?? 56;
    const nodeHeight = fullNode?.measured?.height ?? fullNode?.height ?? 56;

    const viewport = reactFlowInstance.getViewport();

    // Calculate screen position (center of node)
    const x = (selectedNode.position.x + nodeWidth / 2) * viewport.zoom + viewport.x;
    const y = (selectedNode.position.y + nodeHeight / 2) * viewport.zoom + viewport.y;

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
    };
  }, [selectedNode, reactFlowInstance]);

  // Update popover position when node changes
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

  const ContentsComponent = getContentsComponent(selectedNodeData, isDiagnosticModeEnabled);

  const handleDiagnoseClick = () => setIsDiagnosticFlyoutOpen(true);

  const isOpen = !!selectedNode && !!ContentsComponent;

  const trigger = <div style={{ width: 1, height: 1, visibility: 'hidden' }} />;

  return (
    <div
      style={popoverStyle}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <EuiPopover
        anchorPosition={'upCenter'}
        button={trigger}
        closePopover={onClose}
        isOpen={isOpen}
        ref={popoverRef}
        ownFocus={false}
        zIndex={1000}
      >
        <EuiFlexGroup direction="column" gutterSize="s" style={{ minWidth: popoverWidth }}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3 style={{ wordBreak: 'break-all' }}>
                {selectedNodeData.label ?? selectedNodeId}
                {kuery && (
                  <EuiIconTip
                    position="bottom"
                    content={i18n.translate('xpack.actions.serviceMap.kqlFilterInfo', {
                      defaultMessage: 'The KQL filter is not applied in the displayed stats.',
                    })}
                    type="info"
                  />
                )}
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
          </EuiFlexItem>
          {ContentsComponent && (
            <ContentsComponent
              onFocusClick={onFocusClick}
              elementData={selectedNodeData}
              environment={environment}
              kuery={kuery}
              start={start}
              end={end}
              showDiagnoseButton={isDiagnosticModeEnabled}
              onDiagnoseClick={handleDiagnoseClick}
            />
          )}
        </EuiFlexGroup>
      </EuiPopover>
      {selectedNodeData.id && (
        <DiagnosticFlyout
          selectedNode={selectedNodeData}
          isOpen={isDiagnosticFlyoutOpen}
          onClose={() => setIsDiagnosticFlyoutOpen(false)}
        />
      )}
    </div>
  );
}
