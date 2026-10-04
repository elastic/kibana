/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle, EuiIconTip } from '@elastic/eui';
import type { MouseEvent, ComponentType } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import type { Environment } from '../../../../../common/environment_rt';
import { isGroupedNodeData, type ServiceMapNode } from '../../../../../common/service_map';
import { POPOVER_WIDTH } from './constants';
import { DependencyContents } from './dependency_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export type { ServiceMapSelection } from './utils';

/**
 * Props for the popover content subcomponents (service, dependency, resource, etc.)
 * They receive the raw React Flow node.
 */
export interface ContentsProps {
  selection: ServiceMapNode;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  showDiagnoseButton?: boolean;
  onDiagnoseClick?: () => void;
  isEmbedded?: boolean;
  /** Override for the Focus map button visibility. Defaults to `!isEmbedded`. */
  showFocusMap?: boolean;
  /** Strip `kuery` from popover-built URLs (env still flows through). */
  clearKueryOnNavigation?: boolean;
}

/**
 * Returns the content component for the given node selection.
 */
export function getContentsComponent(
  node: ServiceMapNode,
  isDiagnosticModeEnabled: boolean
): ComponentType<ContentsProps> | null {
  const data = node.data;
  if (isGroupedNodeData(data)) {
    return ExternalsListContents;
  }
  if (data.spanType === 'resource') {
    return ResourceContents;
  }
  return DependencyContents;
}

function getPopoverTitle(node: ServiceMapNode): string {
  return node.data.label ?? node.id;
}

interface PopoverContentProps {
  selectedNode: ServiceMapNode | null;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Called when user clicks "Open diagnostic tool" – parent should open the flyout and close the popover. */
  onOpenDiagnostic?: () => void;
  /** When true, hides navigation actions like "Focus map" that don't apply in dashboard embeds. */
  isEmbedded?: boolean;
  /** Optional override for the Focus map button visibility. Defaults to `!isEmbedded`. */
  showFocusMap?: boolean;
  /** When true, popover-built URLs (Service Details / Focus map) drop `kuery`. See `ContentsProps`. */
  clearKueryOnNavigation?: boolean;
}

/**
 * Popover content for the service map.
 */
export function PopoverContent({
  selectedNode,
  environment,
  kuery,
  start,
  end,
  onFocusClick,
  onOpenDiagnostic,
  isEmbedded,
  showFocusMap,
  clearKueryOnNavigation,
}: PopoverContentProps) {
  const { core } = useApmPluginContext();
  const isDiagnosticModeEnabled = core?.uiSettings?.get(enableDiagnosticMode);

  if (selectedNode == null) {
    return null;
  }

  const ContentsComponent = getContentsComponent(selectedNode, isDiagnosticModeEnabled);
  if (!ContentsComponent) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ minWidth: POPOVER_WIDTH }}
      data-test-subj="serviceMapPopoverContent"
    >
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow style={{ minWidth: 0 }}>
            <EuiTitle size="xxs">
              <h3 style={{ wordBreak: 'break-all' }} data-test-subj="serviceMapPopoverTitle">
                {getPopoverTitle(selectedNode)}
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
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
      </EuiFlexItem>
      <ContentsComponent
        selection={selectedNode}
        onFocusClick={onFocusClick}
        environment={environment}
        kuery={kuery}
        start={start}
        end={end}
        showDiagnoseButton={isDiagnosticModeEnabled}
        onDiagnoseClick={onOpenDiagnostic}
        isEmbedded={isEmbedded}
        showFocusMap={showFocusMap}
        clearKueryOnNavigation={clearKueryOnNavigation}
      />
    </EuiFlexGroup>
  );
}
