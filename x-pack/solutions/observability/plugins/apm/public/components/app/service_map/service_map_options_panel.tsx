/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { css } from '@emotion/react';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceMapNode } from '../../../../common/service_map';
import type { ConnectionFilter } from './apply_service_map_visibility';
import type { ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
import {
  getDecoratedAlertStatusOptions,
  getDecoratedAnomalySeverityOptions,
  getDecoratedConnectionOptions,
  getDecoratedSloStatusOptions,
} from './service_map_filter_combobox_options';
import { ServiceMapFindInPage } from './service_map_find_in_page';

export type ServiceMapOrientation = 'horizontal' | 'vertical';

export interface ServiceMapOptionsPanelToggleProps {
  isExpanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /** When true, show a small dot on the toggle indicating filters or a search query are active. */
  hasActiveControls?: boolean;
}

export interface ServiceMapOptionsPanelProps {
  nodes: ServiceMapNode[];
  filterOptionCounts: ServiceMapFilterOptionCounts;
  connectionFilter: ConnectionFilter[];
  onConnectionFilterChange: (next: ConnectionFilter[]) => void;
  alertStatusFilter: AlertStatus[];
  onAlertStatusFilterChange: (next: AlertStatus[]) => void;
  sloStatusFilter: SloStatus[];
  onSloStatusFilterChange: (next: SloStatus[]) => void;
  anomalySeverityFilter: ML_ANOMALY_SEVERITY[];
  onAnomalySeverityFilterChange: (next: ML_ANOMALY_SEVERITY[]) => void;
  mapOrientation: ServiceMapOrientation;
  onMapOrientationChange: (next: ServiceMapOrientation) => void;
  /** Pass-through to ServiceMapFindInPage for controlled search query. */
  searchQuery?: string;
  /** Pass-through to ServiceMapFindInPage; called whenever the user edits the search field. */
  onSearchQueryChange?: (next: string) => void;
}

/** Same hit target as map zoom / fit controls in graph.tsx (2 × base size). */
const useToolbarToggleIconCss = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => css`
      min-inline-size: calc(${euiTheme.size.base} * 2);
      min-block-size: calc(${euiTheme.size.base} * 2);
      padding: ${euiTheme.size.s};
      box-sizing: border-box;

      &:hover {
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      }
    `,
    [euiTheme]
  );
};

export function ServiceMapOptionsPanelToggle({
  isExpanded,
  onExpandedChange,
  hasActiveControls = false,
}: ServiceMapOptionsPanelToggleProps) {
  const mapToolbarToggleIconCss = useToolbarToggleIconCss();
  const { euiTheme } = useEuiTheme();

  // Only badge while collapsed — once open the chips themselves communicate the same thing.
  const showBadge = hasActiveControls && !isExpanded;

  const baseLabel = isExpanded
    ? i18n.translate('xpack.apm.serviceMap.controls.hideControls', {
        defaultMessage: 'Hide controls',
      })
    : i18n.translate('xpack.apm.serviceMap.controls.showControls', {
        defaultMessage: 'Show controls',
      });

  const toggleLabel = showBadge
    ? i18n.translate('xpack.apm.serviceMap.controls.showControlsWithActiveFilters', {
        defaultMessage: '{baseLabel} (filters active)',
        values: { baseLabel },
      })
    : baseLabel;

  const panelWrapperCss = useMemo(
    () => css`
      position: relative;
    `,
    []
  );

  const badgeCss = useMemo(
    () => css`
      position: absolute;
      top: -${euiTheme.size.xs};
      right: -${euiTheme.size.xs};
      width: ${euiTheme.size.s};
      height: ${euiTheme.size.s};
      border-radius: 50%;
      background-color: ${euiTheme.colors.accent};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.emptyShade};
      pointer-events: none;
    `,
    [euiTheme]
  );

  return (
    <EuiPanel
      data-test-subj="serviceMapOptionsPanelToggle"
      hasBorder
      hasShadow={false}
      paddingSize="none"
      borderRadius="m"
      grow={false}
      css={panelWrapperCss}
    >
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        gutterSize="none"
        responsive={false}
      >
        <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            display="empty"
            color={isExpanded ? 'primary' : 'text'}
            size="s"
            iconType="controls"
            css={mapToolbarToggleIconCss}
            onClick={() => onExpandedChange(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={toggleLabel}
            data-test-subj={
              isExpanded ? 'serviceMapHideControlsButton' : 'serviceMapShowControlsButton'
            }
          />
        </EuiToolTip>
      </EuiFlexGroup>
      {showBadge && (
        <span
          css={badgeCss}
          data-test-subj="serviceMapOptionsPanelToggleActiveIndicator"
          aria-hidden="true"
        />
      )}
    </EuiPanel>
  );
}

export function ServiceMapOptionsPanel({
  nodes,
  filterOptionCounts,
  connectionFilter,
  onConnectionFilterChange,
  alertStatusFilter,
  onAlertStatusFilterChange,
  sloStatusFilter,
  onSloStatusFilterChange,
  anomalySeverityFilter,
  onAnomalySeverityFilterChange,
  mapOrientation,
  onMapOrientationChange,
  searchQuery,
  onSearchQueryChange,
}: ServiceMapOptionsPanelProps) {
  const connectionFilterComboBoxOptions = useMemo(
    () => getDecoratedConnectionOptions(filterOptionCounts.connection),
    [filterOptionCounts.connection]
  );

  const alertStatusComboBoxOptions = useMemo(
    () => getDecoratedAlertStatusOptions(filterOptionCounts.alerts),
    [filterOptionCounts.alerts]
  );

  const sloStatusComboBoxOptions = useMemo(
    () => getDecoratedSloStatusOptions(filterOptionCounts.slo),
    [filterOptionCounts.slo]
  );

  const anomalyFilterComboBoxOptions = useMemo(
    () => getDecoratedAnomalySeverityOptions(filterOptionCounts.anomaly),
    [filterOptionCounts.anomaly]
  );

  /** Width constraint for the floating panel; height follows content. */
  const panelSizingCss = useMemo(
    () => css`
      min-width: 280px;
      max-width: 320px;
    `,
    []
  );

  const layoutOrientationIdPrefix = useMemo(() => htmlIdGenerator()(), []);

  const presentationLegend = i18n.translate('xpack.apm.serviceMap.controls.presentationSection', {
    defaultMessage: 'Presentation',
  });

  const mapLayoutOrientationOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: `${layoutOrientationIdPrefix}horizontal`,
        label: i18n.translate('xpack.apm.serviceMap.controls.layoutHorizontal', {
          defaultMessage: 'Horizontal',
        }),
        iconType: 'arrowRight',
        'data-test-subj': 'serviceMapLayoutHorizontal',
      },
      {
        id: `${layoutOrientationIdPrefix}vertical`,
        label: i18n.translate('xpack.apm.serviceMap.controls.layoutVertical', {
          defaultMessage: 'Vertical',
        }),
        iconType: 'arrowDown',
        'data-test-subj': 'serviceMapLayoutVertical',
      },
    ],
    [layoutOrientationIdPrefix]
  );

  return (
    <EuiPanel
      data-test-subj="serviceMapOptionsPanel"
      hasBorder
      hasShadow={false}
      paddingSize="s"
      borderRadius="m"
      grow={false}
      css={panelSizingCss}
    >
      <ServiceMapFindInPage
        nodes={nodes}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
      />

      <EuiHorizontalRule margin="m" />

      <EuiText size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceMap.options.filtersHeading', {
            defaultMessage: 'Filters',
          })}
        </h3>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiComboBox
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.connectionFilter', {
          defaultMessage: 'Dependencies',
        })}
        options={connectionFilterComboBoxOptions}
        selectedOptions={connectionFilter.map((value) => {
          const opt = connectionFilterComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onConnectionFilterChange(selected.map((s) => s.value as ConnectionFilter));
        }}
        fullWidth
        compressed
        isClearable
        data-test-subj="serviceMapConnectionFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.connectionFilterAriaLabel', {
          defaultMessage: 'Filter by dependency status',
        })}
      />

      <EuiSpacer size="m" />

      <EuiComboBox
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.alertStatusFilter', {
          defaultMessage: 'Alert status',
        })}
        options={alertStatusComboBoxOptions}
        selectedOptions={alertStatusFilter.map((value) => {
          const opt = alertStatusComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onAlertStatusFilterChange(selected.map((s) => s.value as AlertStatus));
        }}
        fullWidth
        compressed
        isClearable={true}
        data-test-subj="serviceMapAlertStatusFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.alertStatusAriaLabel', {
          defaultMessage: 'Filter by alert status',
        })}
      />

      <EuiSpacer size="m" />

      <EuiComboBox
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.sloStatusFilter', {
          defaultMessage: 'SLO status',
        })}
        options={sloStatusComboBoxOptions}
        selectedOptions={sloStatusFilter.map((value) => {
          const opt = sloStatusComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onSloStatusFilterChange(selected.map((s) => s.value as SloStatus));
        }}
        fullWidth
        compressed
        isClearable={true}
        data-test-subj="serviceMapSloStatusFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.sloStatusAriaLabel', {
          defaultMessage: 'Filter by SLO status',
        })}
      />

      <EuiSpacer size="m" />

      <EuiComboBox
        placeholder={i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityFilter', {
          defaultMessage: 'Anomaly severity',
        })}
        options={anomalyFilterComboBoxOptions}
        selectedOptions={anomalySeverityFilter.map((value) => {
          const opt = anomalyFilterComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onAnomalySeverityFilterChange(selected.map((s) => s.value as ML_ANOMALY_SEVERITY));
        }}
        fullWidth
        compressed
        isClearable={true}
        data-test-subj="serviceMapAnomalySeverityFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityAriaLabel', {
          defaultMessage: 'Filter by anomaly severity',
        })}
      />

      <EuiSpacer size="m" />

      <EuiText size="xs" data-test-subj="serviceMapPresentationSettings">
        <h3>{presentationLegend}</h3>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        isFullWidth
        legend={presentationLegend}
        buttonSize="compressed"
        options={mapLayoutOrientationOptions}
        idSelected={`${layoutOrientationIdPrefix}${mapOrientation}`}
        onChange={(optionId) => {
          const suffix = optionId.slice(layoutOrientationIdPrefix.length);
          if (suffix === 'horizontal' || suffix === 'vertical') {
            onMapOrientationChange(suffix);
          }
        }}
        data-test-subj="serviceMapLayoutOrientationButtonGroup"
      />
    </EuiPanel>
  );
}
