/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTable,
  EuiTableBody,
  EuiTableCell,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTitle,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import type { MouseEvent, ComponentType } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import type { Environment } from '../../../../../common/environment_rt';
import {
  isServiceNodeData,
  isGroupedNodeData,
  type ServiceMapNode,
  type ServiceMapEdge,
} from '../../../../../common/service_map';
import { isEdge, type ServiceMapSelection } from './utils';
import { POPOVER_WIDTH } from './constants';
import { DependencyContents } from './dependency_contents';
import { EdgeContents } from './edge_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { ServiceContents } from './service_contents';
import { withDiagnoseButton } from './with_diagnose_button';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export type { ServiceMapSelection } from './utils';
export { isEdge } from './utils';

/**
 * Props for the popover content subcomponents (service, dependency, edge, etc.)
 * They receive the raw React Flow node or edge.
 */
export interface ContentsProps {
  selection: ServiceMapSelection;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  showDiagnoseButton?: boolean;
  onDiagnoseClick?: () => void;
}

export const ServiceContentsWithDiagnose = withDiagnoseButton(ServiceContents);

/**
 * Returns the content component for the given selection (node or edge).
 */
export function getContentsComponent(
  selection: ServiceMapSelection,
  isDiagnosticModeEnabled: boolean
): ComponentType<ContentsProps> | null {
  if (isEdge(selection)) {
    return EdgeContents;
  }
  const data = selection.data;
  if (isGroupedNodeData(data)) {
    return ExternalsListContents;
  }
  if (isServiceNodeData(data)) {
    return isDiagnosticModeEnabled ? ServiceContentsWithDiagnose : ServiceContents;
  }
  if (data.spanType === 'resource') {
    return ResourceContents;
  }
  return DependencyContents;
}

export interface PopoverAlert {
  id: string;
  title: string;
  severity: string;
  time: string;
}

export interface PopoverFailedRequest {
  time: string;
  errorMessage: string;
  requestId: string;
}

function getPopoverTitle(selection: ServiceMapSelection): string {
  if (isEdge(selection)) {
    const source = selection.data?.sourceLabel ?? selection.source;
    const target = selection.data?.targetLabel ?? selection.target;
    return `${source} → ${target}`;
  }
  return selection.data.label ?? selection.id;
}

interface PopoverContentProps {
  selectedNode: ServiceMapNode | null;
  selectedEdge: ServiceMapEdge | null;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Called when user clicks "Open diagnostic tool" – parent should open the flyout and close the popover. */
  onOpenDiagnostic?: () => void;
  /** Optional alerts to show for the selected service (e.g. demo/story). When set, title shows alert count badge. */
  alerts?: PopoverAlert[];
  /** Optional failed requests per edge id (e.g. demo/story). When set, edge popover shows failed requests table. */
  failedRequestsByEdge?: Record<string, PopoverFailedRequest[]>;
}

/**
 * Popover content for the service map.
 */
export function PopoverContent({
  selectedNode,
  selectedEdge,
  environment,
  kuery,
  start,
  end,
  onFocusClick,
  onOpenDiagnostic,
  alerts: alertsProp,
  failedRequestsByEdge,
}: PopoverContentProps) {
  const { core } = useApmPluginContext();
  const isDiagnosticModeEnabled = core?.uiSettings?.get(enableDiagnosticMode);

  const selection = selectedEdge ?? selectedNode;
  if (selection == null) {
    return null;
  }

  const alertCount = selectedNode
    ? (selectedNode.data as Record<string, unknown>)?.alertCount as number | undefined
    : undefined;
  const showAlerts = selectedNode && alertCount != null && alertCount > 0 && alertsProp?.length;
  const failedRequests =
    (selectedEdge && failedRequestsByEdge?.[selectedEdge.id]) ?? [];
  /** When demo failed-requests data is provided for an edge, we skip EdgeContents (it uses API hooks that error in Storybook). */
  const isEdgeDemoMode =
    !!selectedEdge && failedRequestsByEdge != null && selectedEdge.id in failedRequestsByEdge;

  // Edge demo mode: render title + failed requests only; never load or render EdgeContents.
  if (isEdgeDemoMode) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ minWidth: POPOVER_WIDTH }}
        data-test-subj="serviceMapPopoverContent"
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3
              style={{ wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 8 }}
              data-test-subj="serviceMapPopoverTitle"
            >
              {getPopoverTitle(selection)}
            </h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
        {failedRequests.length > 0 && (
          <>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>Failed requests</strong> ({failedRequests.length})
              </EuiText>
              <EuiTable size="s">
                <EuiTableHeader>
                  <EuiTableRow>
                    <EuiTableHeaderCell>Time</EuiTableHeaderCell>
                    <EuiTableHeaderCell>Error</EuiTableHeaderCell>
                    <EuiTableHeaderCell>Request ID</EuiTableHeaderCell>
                  </EuiTableRow>
                </EuiTableHeader>
                <EuiTableBody>
                  {failedRequests.map((r) => (
                    <EuiTableRow key={r.requestId}>
                      <EuiTableCell>
                        {r.time.replace('T', ' ').replace('Z', '')}
                      </EuiTableCell>
                      <EuiTableCell>{r.errorMessage}</EuiTableCell>
                      <EuiTableCell>{r.requestId}</EuiTableCell>
                    </EuiTableRow>
                  ))}
                </EuiTableBody>
              </EuiTable>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    );
  }

  const ContentsComponent = getContentsComponent(selection, isDiagnosticModeEnabled);
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
        <EuiTitle size="xxs">
          <h3
            style={{ wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 8 }}
            data-test-subj="serviceMapPopoverTitle"
          >
            {getPopoverTitle(selection)}
            {selectedNode && alertCount != null && alertCount > 0 && (
              <EuiBadge color="danger" data-test-subj="serviceMapPopoverAlertBadge">
                {alertCount} alerts
              </EuiBadge>
            )}
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
      {showAlerts && alertsProp && (
        <>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Alerts</strong> ({alertCount})
            </EuiText>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {alertsProp.slice(0, alertCount).map((a) => (
                <li key={a.id}>
                  <EuiText size="s">
                    {a.title}{' '}
                    <span style={{ color: 'var(--euiColorMediumShade)' }}>({a.severity})</span>
                  </EuiText>
                </li>
              ))}
            </ul>
          </EuiFlexItem>
          <EuiHorizontalRule margin="xs" />
        </>
      )}
      {selectedEdge && failedRequests.length > 0 && (
        <>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Failed requests</strong> ({failedRequests.length})
            </EuiText>
            <EuiTable size="s">
              <EuiTableHeader>
                <EuiTableRow>
                  <EuiTableHeaderCell>Time</EuiTableHeaderCell>
                  <EuiTableHeaderCell>Error</EuiTableHeaderCell>
                  <EuiTableHeaderCell>Request ID</EuiTableHeaderCell>
                </EuiTableRow>
              </EuiTableHeader>
              <EuiTableBody>
                {failedRequests.map((r) => (
                  <EuiTableRow key={r.requestId}>
                    <EuiTableCell>
                      {r.time.replace('T', ' ').replace('Z', '')}
                    </EuiTableCell>
                    <EuiTableCell>{r.errorMessage}</EuiTableCell>
                    <EuiTableCell>{r.requestId}</EuiTableCell>
                  </EuiTableRow>
                ))}
              </EuiTableBody>
            </EuiTable>
          </EuiFlexItem>
          <EuiHorizontalRule margin="xs" />
        </>
      )}
      <ContentsComponent
        selection={selection}
        onFocusClick={onFocusClick}
        environment={environment}
        kuery={kuery}
        start={start}
        end={end}
        showDiagnoseButton={isDiagnosticModeEnabled}
        onDiagnoseClick={onOpenDiagnostic}
      />
    </EuiFlexGroup>
  );
}
