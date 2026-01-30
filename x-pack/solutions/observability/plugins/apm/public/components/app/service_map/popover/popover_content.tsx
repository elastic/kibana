/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle, EuiIconTip } from '@elastic/eui';
import type { MouseEvent, ComponentType } from 'react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
import type { Environment } from '../../../../../common/environment_rt';
import { popoverWidth } from '../cytoscape_options';
import { DependencyContents } from './dependency_contents';
import { EdgeContents } from './edge_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { ServiceContents } from './service_contents';
import { withDiagnoseButton } from './with_diagnose_button';
import { DiagnosticFlyout } from '../diagnostic_tool/diagnostic_flyout';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

/**
 * Unified element data format that works with both Cytoscape and React Flow
 */
export interface ElementData extends Record<string, unknown> {
  id: string;
  label?: string;
}

/**
 * Determines which content component to render based on the element data.
 * This function works with both Cytoscape and React Flow node data.
 */
export function getContentsComponent(
  elementData: ElementData,
  isDiagnosticModeEnabled: boolean
): ComponentType<any> | null {
  // Grouped nodes (externals list)
  if (elementData.groupedConnections && Array.isArray(elementData.groupedConnections)) {
    return ExternalsListContents;
  }

  // Service nodes - check both SERVICE_NAME (Cytoscape) and isService (React Flow)
  if (elementData[SERVICE_NAME] || elementData.isService === true) {
    return isDiagnosticModeEnabled ? withDiagnoseButton(ServiceContents) : ServiceContents;
  }

  // Resource nodes
  if (elementData[SPAN_TYPE] === 'resource' || elementData.spanType === 'resource') {
    return ResourceContents;
  }

  // Edge elements
  if (elementData.source && elementData.target) {
    return EdgeContents;
  }

  // Dependency/external nodes
  if (elementData.label) {
    return DependencyContents;
  }

  return null;
}

interface PopoverContentProps {
  elementData: ElementData;
  /** The element ID (used as fallback for label) */
  elementId: string;
  environment: Environment;
  /** KQL filter */
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Shared popover content component used by both Cytoscape and React Flow service maps.
 * Renders the popover title, divider, and appropriate contents component.
 */
export function PopoverContent({
  elementData,
  elementId,
  environment,
  kuery,
  start,
  end,
  onFocusClick,
}: PopoverContentProps) {
  const { core } = useApmPluginContext();
  const isDiagnosticModeEnabled = core.uiSettings.get(enableDiagnosticMode);
  const [isDiagnosticFlyoutOpen, setIsDiagnosticFlyoutOpen] = useState(false);

  const ContentsComponent = getContentsComponent(elementData, isDiagnosticModeEnabled);

  const handleDiagnoseClick = useCallback(() => setIsDiagnosticFlyoutOpen(true), []);
  const handleCloseDiagnosticFlyout = useCallback(() => setIsDiagnosticFlyoutOpen(false), []);

  if (!ContentsComponent) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ minWidth: popoverWidth }}
        data-test-subj="serviceMapPopoverContent"
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3 style={{ wordBreak: 'break-all' }} data-test-subj="serviceMapPopoverTitle">
              {elementData.label ?? elementId}
              {kuery && (
                <EuiIconTip
                  position="bottom"
                  content={i18n.translate('xpack.apm.serviceMap.kqlFilterInfo', {
                    defaultMessage: 'The KQL filter is not applied in the displayed stats.',
                  })}
                  type="info"
                />
              )}
            </h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
        <ContentsComponent
          onFocusClick={onFocusClick}
          elementData={elementData}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          showDiagnoseButton={isDiagnosticModeEnabled}
          onDiagnoseClick={handleDiagnoseClick}
        />
      </EuiFlexGroup>
      {elementData.id && (
        <DiagnosticFlyout
          selectedNode={elementData}
          isOpen={isDiagnosticFlyoutOpen}
          onClose={handleCloseDiagnosticFlyout}
        />
      )}
    </>
  );
}
