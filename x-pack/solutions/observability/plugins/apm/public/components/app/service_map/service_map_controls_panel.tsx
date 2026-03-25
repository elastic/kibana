/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useReactFlow } from '@xyflow/react';
import { css } from '@emotion/react';
import type { ServiceMapNode, ServiceNodeData } from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import {
  type ServiceMapControlState,
  type LayoutDirection,
  SERVICE_MAP_GROUP_BY_FIELDS,
} from './service_map_control_state';
import { AGENT_NAME, SERVICE_ENVIRONMENT } from '../../../../common/es_fields/apm';
import { getDistinctGroupValues } from './apply_group_by';
import { CENTER_ANIMATION_DURATION_MS, NODE_WIDTH, NODE_HEIGHT } from './constants';

/** Fields we get from node data; only hide when these have every value = "unknown". */
const NODE_DERIVED_GROUP_BY_FIELDS = new Set([SERVICE_ENVIRONMENT, AGENT_NAME]);

/** Values treated as "no data" – hide field only when every value is in this set. */
const MEANINGLESS_GROUP_VALUES = new Set(['unknown', 'undefined', '']);

function hasMeaningfulGroupValue(values: Set<string>): boolean {
  return [...values].some((v) => !MEANINGLESS_GROUP_VALUES.has(v));
}
import type { SloStatus } from '../../../../common/service_inventory';
import {
  type ServiceHealthStatus,
  ServiceHealthStatus as HealthStatus,
  getServiceHealthStatusLabel,
} from '../../../../common/service_health_status';

const CENTER_ZOOM = 1.2;

const SLO_STATUS_OPTIONS: { value: SloStatus; label: string }[] = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'degrading', label: 'Degrading' },
  { value: 'violated', label: 'Violated' },
  { value: 'noData', label: 'No data' },
];

const ANOMALY_STATUS_OPTIONS: { value: ServiceHealthStatus; label: string }[] = [
  { value: HealthStatus.healthy, label: getServiceHealthStatusLabel(HealthStatus.healthy) },
  { value: HealthStatus.warning, label: getServiceHealthStatusLabel(HealthStatus.warning) },
  { value: HealthStatus.critical, label: getServiceHealthStatusLabel(HealthStatus.critical) },
  { value: HealthStatus.unknown, label: getServiceHealthStatusLabel(HealthStatus.unknown) },
];

/**
 * Group-by options: show fields that have at least one meaningful value (e.g. request; unknown/undefined/empty don't count).
 * Hide only when every value is "unknown", "undefined", or empty (and we have real data).
 */
function getGroupByFieldOptions(
  nodes: ServiceMapNode[],
  serviceGroupByValues?: Record<string, string>,
  currentGroupBy?: string | null
): Array<{ label: string; value: string }> {
  const serviceNodes = nodes.filter((n) => n.type === 'service' && isServiceNodeData(n.data));
  if (serviceNodes.length === 0) return [];

  const allowed = new Set(
    SERVICE_MAP_GROUP_BY_FIELDS.filter((field) => {
      const values = getDistinctGroupValues(
        nodes,
        field,
        field === currentGroupBy ? serviceGroupByValues : undefined
      );
      if (values.size === 0) return false;
      // At least one meaningful value (e.g. request + unknown) → show
      if (hasMeaningfulGroupValue(values)) return true;
      // Every value is unknown/undefined/empty → hide only when we have real data (node-derived or fetched)
      const hasRealData = NODE_DERIVED_GROUP_BY_FIELDS.has(field) || field === currentGroupBy;
      if (hasRealData) return false;
      // No real data yet (e.g. transaction.type before selection) → show so user can select
      return true;
    })
  );
  // Always include current selection so it remains visible when clearing or switching
  if (currentGroupBy && !allowed.has(currentGroupBy)) {
    allowed.add(currentGroupBy);
  }
  return [...allowed].sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value }));
}

export interface ServiceMapControlsPanelProps {
  nodes: ServiceMapNode[];
  controlState: ServiceMapControlState;
  onControlStateChange: (state: Partial<ServiceMapControlState>) => void;
  /** All service nodes before SLO/anomaly filter; used to show counts per status. */
  allServiceNodesForCounts?: ServiceMapNode[];
  /** Group-by values from API for the current groupBy field; used to show options with meaningful variety. */
  serviceGroupByValues?: Record<string, string>;
}

export interface ServiceMapControlsPanelContentProps {
  nodes: ServiceMapNode[];
  controlState: ServiceMapControlState;
  onControlStateChange: (state: Partial<ServiceMapControlState>) => void;
  onClose: () => void;
  /** All service nodes before SLO/anomaly filter; used to show counts per status. */
  allServiceNodesForCounts?: ServiceMapNode[];
  /** Group-by values from API for the current groupBy field; used to show options with meaningful variety. */
  serviceGroupByValues?: Record<string, string>;
}

function getServiceNodes(nodes: ServiceMapNode[]): ServiceMapNode[] {
  return nodes.filter((n) => n.type === 'service' && isServiceNodeData(n.data));
}

/** Services and dependencies – nodes that can be searched and navigated to. */
function getSearchableNodes(nodes: ServiceMapNode[]): ServiceMapNode[] {
  return nodes.filter(
    (n) => (n.type === 'service' && isServiceNodeData(n.data)) || n.type === 'dependency'
  );
}

/**
 * When grouping is active, service nodes have parentId and position is relative to the group.
 * This returns the absolute position in flow coordinates so setCenter works correctly.
 */
function getAbsolutePosition(
  node: ServiceMapNode,
  allNodes: ServiceMapNode[]
): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let current: ServiceMapNode | undefined = node;
  while (current?.parentId) {
    const parent = allNodes.find((n) => n.id === current!.parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    current = parent;
  }
  return { x, y };
}

const SEARCH_SHORTCUT_KEY = 'k';
const isSearchShortcut = (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === SEARCH_SHORTCUT_KEY;

export function ServiceMapControlsPanel({
  nodes,
  controlState,
  onControlStateChange,
  allServiceNodesForCounts,
  serviceGroupByValues,
}: ServiceMapControlsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSearchShortcut(e)) return;
      e.preventDefault();
      setIsOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const button = (
    <EuiButtonIcon
      iconType="controlsHorizontal"
      color="text"
      onClick={() => setIsOpen((prev) => !prev)}
      aria-label={
        isOpen
          ? i18n.translate('xpack.apm.serviceMap.controls.hideSidebarAriaLabel', {
              defaultMessage: 'Hide sidebar',
            })
          : i18n.translate('xpack.apm.serviceMap.controls.showSidebarAriaLabel', {
              defaultMessage: 'Show sidebar',
            })
      }
      data-test-subj="serviceMapControlsMenuButton"
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="leftUp"
      panelPaddingSize="none"
      data-test-subj="serviceMapControlsPopover"
    >
      <ServiceMapControlsPanelContent
        nodes={nodes}
        controlState={controlState}
        onControlStateChange={onControlStateChange}
        onClose={() => setIsOpen(false)}
        allServiceNodesForCounts={allServiceNodesForCounts}
        serviceGroupByValues={serviceGroupByValues}
      />
    </EuiPopover>
  );
}

/** Count services by SLO status (sloStatus ?? 'noData'). */
function getSloStatusCounts(serviceNodes: ServiceMapNode[]): Record<SloStatus, number> {
  const counts: Record<SloStatus, number> = {
    healthy: 0,
    degrading: 0,
    violated: 0,
    noData: 0,
  };
  for (const node of serviceNodes) {
    if (node.type !== 'service' || !isServiceNodeData(node.data)) continue;
    const status = (node.data as ServiceNodeData).sloStatus ?? 'noData';
    if (status in counts) counts[status as SloStatus]++;
  }
  return counts;
}

/** Count services by anomaly/health status (serviceAnomalyStats?.healthStatus ?? 'unknown'). */
function getAnomalyStatusCounts(
  serviceNodes: ServiceMapNode[]
): Record<ServiceHealthStatus, number> {
  const counts: Record<ServiceHealthStatus, number> = {
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0,
  };
  for (const node of serviceNodes) {
    if (node.type !== 'service' || !isServiceNodeData(node.data)) continue;
    const status = (node.data as ServiceNodeData).serviceAnomalyStats?.healthStatus ?? 'unknown';
    if (status in counts) counts[status as ServiceHealthStatus]++;
  }
  return counts;
}

export function ServiceMapControlsPanelContent({
  nodes,
  controlState,
  onControlStateChange,
  onClose,
  allServiceNodesForCounts,
  serviceGroupByValues,
}: ServiceMapControlsPanelContentProps) {
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLUListElement>(null);
  const { setCenter } = useReactFlow();

  useLayoutEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSearchShortcut(e)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const nodesForCounts = allServiceNodesForCounts ?? nodes;
  const serviceNodesForCounts = useMemo(() => getServiceNodes(nodesForCounts), [nodesForCounts]);
  const sloStatusCounts = useMemo(
    () => getSloStatusCounts(serviceNodesForCounts),
    [serviceNodesForCounts]
  );
  const anomalyStatusCounts = useMemo(
    () => getAnomalyStatusCounts(serviceNodesForCounts),
    [serviceNodesForCounts]
  );

  const servicesWithActiveAlertsCount = useMemo(
    () =>
      serviceNodesForCounts.filter(
        (n) => isServiceNodeData(n.data) && (n.data.alertsCount ?? 0) > 0
      ).length,
    [serviceNodesForCounts]
  );

  const sloStatusComboBoxOptions = useMemo(
    () =>
      SLO_STATUS_OPTIONS.map((opt) => {
        const count = sloStatusCounts[opt.value];
        return {
          label: opt.label,
          value: opt.value,
          append: (
            <EuiBadge color={count === 0 ? 'subdued' : 'hollow'} title={String(count)}>
              {count}
            </EuiBadge>
          ),
          disabled: count === 0,
        };
      }),
    [sloStatusCounts]
  );

  const anomalyStatusComboBoxOptions = useMemo(
    () =>
      ANOMALY_STATUS_OPTIONS.map((opt) => {
        const count = anomalyStatusCounts[opt.value];
        return {
          label: opt.label,
          value: opt.value,
          append: (
            <EuiBadge color={count === 0 ? 'subdued' : 'hollow'} title={String(count)}>
              {count}
            </EuiBadge>
          ),
          disabled: count === 0,
        };
      }),
    [anomalyStatusCounts]
  );

  const nodesForGroupByOptions = allServiceNodesForCounts ?? nodes;
  const groupByFieldOptions = useMemo(
    () =>
      getGroupByFieldOptions(nodesForGroupByOptions, serviceGroupByValues, controlState.groupBy),
    [nodesForGroupByOptions, serviceGroupByValues, controlState.groupBy]
  );
  const searchableNodes = useMemo(() => getSearchableNodes(nodes), [nodes]);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return searchableNodes;
    const q = searchQuery.toLowerCase();
    return searchableNodes.filter(
      (node) =>
        (node.data.label && String(node.data.label).toLowerCase().includes(q)) ||
        node.id.toLowerCase().includes(q)
    );
  }, [searchableNodes, searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const centerMapOnNode = useCallback(
    (node: ServiceMapNode) => {
      const { x, y } = getAbsolutePosition(node, nodes);
      const centerX = x + NODE_WIDTH / 2;
      const centerY = y + NODE_HEIGHT / 2;
      setCenter(centerX, centerY, {
        zoom: CENTER_ZOOM,
        duration: CENTER_ANIMATION_DURATION_MS,
      });
    },
    [nodes, setCenter]
  );

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (searchResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const node = searchResults[selectedIndex];
        if (node) {
          centerMapOnNode(node);
          setSelectedIndex((i) => (i + 1) % searchResults.length);
        }
        return;
      }
    },
    [searchResults, selectedIndex, centerMapOnNode]
  );

  useLayoutEffect(() => {
    const el = resultsListRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const panelStyle = useMemo(
    () => css`
      min-width: 280px;
      max-width: 320px;
      padding: ${euiTheme.size.m};
    `,
    [euiTheme.size.m]
  );

  return (
    <div css={panelStyle} data-test-subj="serviceMapControlsPopover">
      {/* Search: Cmd+K to open; Enter cycles centering the map through matches (popover stays open) */}
      <EuiFormLabel>
        {i18n.translate('xpack.apm.serviceMap.controls.findInPage', {
          defaultMessage: 'Find in page (⌘K)',
        })}
      </EuiFormLabel>
      <EuiSpacer size="xs" />
      <EuiFieldSearch
        inputRef={(el) => {
          (searchInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
        }}
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.searchPlaceholder', {
          defaultMessage: 'Search services and dependencies...',
        })}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={onSearchKeyDown}
        fullWidth
        incremental
        data-test-subj="serviceMapControlsSearch"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.searchAriaLabel', {
          defaultMessage:
            'Search map; Arrow keys change selection, Enter centers the map on the selection and moves to the next match',
        })}
      />
      {searchQuery.trim() && searchResults.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <ul
            ref={resultsListRef}
            className="eui-yScrollWithShadows"
            style={{
              maxHeight: 200,
              margin: 0,
              paddingLeft: euiTheme.size.m,
              listStyle: 'none',
            }}
            data-test-subj="serviceMapControlsSearchResults"
          >
            {searchResults.map((node, index) => (
              <li key={node.id} data-index={index}>
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  onClick={() => centerMapOnNode(node)}
                  data-test-subj={`serviceMapGoToService-${node.id}`}
                  css={
                    index === selectedIndex
                      ? css`
                          background-color: ${euiTheme.colors.backgroundBaseSubdued};
                          font-weight: 500;
                        `
                      : undefined
                  }
                >
                  {node.data.label ?? node.id}
                </EuiButtonEmpty>
              </li>
            ))}
          </ul>
        </>
      )}
      {searchQuery.trim() && searchResults.length === 0 && (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.apm.serviceMap.controls.noResultsFound', {
            defaultMessage: 'No services or dependencies found',
          })}
        </EuiText>
      )}

      <EuiSpacer size="m" />

      {/* Show only services with active alerts */}
      <EuiSwitch
        label={
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              gap: ${euiTheme.size.s};
              flex-wrap: wrap;
            `}
          >
            {i18n.translate('xpack.apm.serviceMap.controls.showOnlyActiveAlerts', {
              defaultMessage: 'Show only active alerts',
            })}
            <EuiBadge
              color={servicesWithActiveAlertsCount === 0 ? 'subdued' : 'hollow'}
              title={i18n.translate(
                'xpack.apm.serviceMap.controls.activeAlertsServiceCountBadgeTitle',
                {
                  defaultMessage:
                    '{count, plural, one {# service with active alerts} other {# services with active alerts}}',
                  values: { count: servicesWithActiveAlertsCount },
                }
              )}
            >
              {servicesWithActiveAlertsCount}
            </EuiBadge>
          </span>
        }
        checked={controlState.showOnlyActiveAlerts}
        onChange={(e) => onControlStateChange({ showOnlyActiveAlerts: e.target.checked })}
        data-test-subj="serviceMapShowOnlyActiveAlerts"
      />

      <EuiSpacer size="m" />

      {/* SLO status filter – multiselect; empty = all statuses, show only services matching selected */}
      <EuiFormLabel>
        {i18n.translate('xpack.apm.serviceMap.controls.sloStatusFilter', {
          defaultMessage: 'SLO status',
        })}
      </EuiFormLabel>
      <EuiSpacer size="xs" />
      <EuiComboBox
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.sloStatusPlaceholder', {
          defaultMessage: 'All statuses',
        })}
        options={sloStatusComboBoxOptions}
        selectedOptions={controlState.sloStatusFilter.map((value) => {
          const opt = sloStatusComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onControlStateChange({
            sloStatusFilter: selected.map((s) => (s.value ?? s.label) as SloStatus),
          });
        }}
        fullWidth
        isClearable={true}
        data-test-subj="serviceMapSloStatusFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.sloStatusAriaLabel', {
          defaultMessage: 'Filter by SLO status',
        })}
      />

      <EuiSpacer size="m" />

      {/* Anomaly status filter – multiselect; empty = all statuses, show only services matching selected */}
      <EuiFormLabel>
        {i18n.translate('xpack.apm.serviceMap.controls.anomalyStatusFilter', {
          defaultMessage: 'Anomaly status',
        })}
      </EuiFormLabel>
      <EuiSpacer size="xs" />
      <EuiComboBox
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.anomalyStatusPlaceholder', {
          defaultMessage: 'All statuses',
        })}
        options={anomalyStatusComboBoxOptions}
        selectedOptions={controlState.anomalyStatusFilter.map((value) => {
          const opt = anomalyStatusComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onControlStateChange({
            anomalyStatusFilter: selected.map((s) => (s.value ?? s.label) as ServiceHealthStatus),
          });
        }}
        fullWidth
        isClearable={true}
        data-test-subj="serviceMapAnomalyStatusFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.anomalyStatusAriaLabel', {
          defaultMessage: 'Filter by anomaly status',
        })}
      />

      <EuiSpacer size="m" />

      {/* Group by – searchable APM field list from docs */}
      <EuiFormLabel>
        {i18n.translate('xpack.apm.serviceMap.controls.groupByLabel', {
          defaultMessage: 'Group by',
        })}
      </EuiFormLabel>
      <EuiSpacer size="xs" />
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.groupByPlaceholder', {
          defaultMessage: 'Search or select APM field…',
        })}
        options={groupByFieldOptions}
        selectedOptions={
          controlState.groupBy ? [{ label: controlState.groupBy, value: controlState.groupBy }] : []
        }
        onChange={(selected) => {
          const next = selected.length === 0 ? null : selected[0].value ?? selected[0].label;
          onControlStateChange({ groupBy: next });
        }}
        fullWidth
        isClearable={true}
        data-test-subj="serviceMapGroupByComboBox"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.groupByAriaLabel', {
          defaultMessage: 'Group by APM field',
        })}
      />

      <EuiSpacer size="m" />

      {/* Presentation: Horizontal / Vertical */}
      <EuiText size="xs" color="subdued">
        <strong>
          {i18n.translate('xpack.apm.serviceMap.controls.presentationSection', {
            defaultMessage: 'Presentation',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="arrowRight"
            onClick={() =>
              onControlStateChange({ layoutDirection: 'horizontal' as LayoutDirection })
            }
            isSelected={controlState.layoutDirection === 'horizontal'}
            data-test-subj="serviceMapLayoutHorizontal"
          >
            {i18n.translate('xpack.apm.serviceMap.controls.layoutHorizontal', {
              defaultMessage: 'Horizontal',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="arrowDown"
            onClick={() => onControlStateChange({ layoutDirection: 'vertical' as LayoutDirection })}
            isSelected={controlState.layoutDirection === 'vertical'}
            data-test-subj="serviceMapLayoutVertical"
          >
            {i18n.translate('xpack.apm.serviceMap.controls.layoutVertical', {
              defaultMessage: 'Vertical',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
