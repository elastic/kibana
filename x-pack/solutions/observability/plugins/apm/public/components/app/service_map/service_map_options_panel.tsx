/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertStatus } from '@kbn/rule-data-utils';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { css } from '@emotion/react';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceMapNode } from '../../../../common/service_map';
import type { ConnectionFilter } from './apply_service_map_visibility';
import type { ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
import { ServiceMapFindInPage } from './service_map_find_in_page';

export type ServiceMapOrientation = 'horizontal' | 'vertical';

const CONNECTION_FILTER_OPTIONS: { value: ConnectionFilter; label: string }[] = [
  {
    value: 'orphaned',
    label: i18n.translate('xpack.apm.serviceMap.controls.connectionOrphaned', {
      defaultMessage: 'No connections',
    }),
  },
  {
    value: 'connected',
    label: i18n.translate('xpack.apm.serviceMap.controls.connectionConnected', {
      defaultMessage: 'With connections',
    }),
  },
];

const ALERT_STATUS_OPTIONS: { value: AlertStatus; label: string }[] = [
  {
    value: ALERT_STATUS_ACTIVE,
    label: i18n.translate('xpack.apm.serviceMap.controls.alertStatusActive', {
      defaultMessage: 'Active',
    }),
  },
  {
    value: ALERT_STATUS_RECOVERED,
    label: i18n.translate('xpack.apm.serviceMap.controls.alertStatusRecovered', {
      defaultMessage: 'Recovered',
    }),
  },
  {
    value: ALERT_STATUS_UNTRACKED,
    label: i18n.translate('xpack.apm.serviceMap.controls.alertStatusUntracked', {
      defaultMessage: 'Untracked',
    }),
  },
  {
    value: ALERT_STATUS_DELAYED,
    label: i18n.translate('xpack.apm.serviceMap.controls.alertStatusDelayed', {
      defaultMessage: 'Delayed',
    }),
  },
];

const SLO_STATUS_OPTIONS: { value: SloStatus; label: string }[] = [
  {
    value: 'healthy',
    label: i18n.translate('xpack.apm.serviceMap.controls.sloHealthy', {
      defaultMessage: 'Healthy',
    }),
  },
  {
    value: 'degrading',
    label: i18n.translate('xpack.apm.serviceMap.controls.sloDegrading', {
      defaultMessage: 'Degrading',
    }),
  },
  {
    value: 'violated',
    label: i18n.translate('xpack.apm.serviceMap.controls.sloViolated', {
      defaultMessage: 'Violated',
    }),
  },
  {
    value: 'noData',
    label: i18n.translate('xpack.apm.serviceMap.controls.sloNoData', {
      defaultMessage: 'No data',
    }),
  },
];

const ANOMALY_SEVERITY_OPTIONS: { value: ML_ANOMALY_SEVERITY; label: string }[] = [
  {
    value: ML_ANOMALY_SEVERITY.CRITICAL,
    label: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityCritical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.MAJOR,
    label: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityMajor', {
      defaultMessage: 'Major',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.MINOR,
    label: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityMinor', {
      defaultMessage: 'Minor',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.WARNING,
    label: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityWarning', {
      defaultMessage: 'Warning',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.LOW,
    label: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityLow', {
      defaultMessage: 'Low',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.UNKNOWN,
    label: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityUnknown', {
      defaultMessage: 'Unknown',
    }),
  },
];

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
        <EuiButtonIcon
          display="empty"
          color={isExpanded ? 'primary' : 'text'}
          size="s"
          iconType="controls"
          css={mapToolbarToggleIconCss}
          onClick={() => onExpandedChange(!isExpanded)}
          aria-expanded={isExpanded}
          title={toggleLabel}
          aria-label={toggleLabel}
          data-test-subj={
            isExpanded ? 'serviceMapHideControlsButton' : 'serviceMapShowControlsButton'
          }
        />
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
  const connectionCounts = filterOptionCounts.connection;
  const alertCounts = filterOptionCounts.alerts;
  const sloStatusCounts = filterOptionCounts.slo;
  const anomalySeverityCounts = filterOptionCounts.anomaly;

  const connectionFilterComboBoxOptions = useMemo(
    () =>
      CONNECTION_FILTER_OPTIONS.map((opt) => {
        let count: number;
        switch (opt.value) {
          case 'orphaned':
            count = connectionCounts.orphaned;
            break;
          case 'connected':
            count = connectionCounts.connected;
            break;
        }
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
    [connectionCounts]
  );

  const alertStatusComboBoxOptions = useMemo(
    () =>
      ALERT_STATUS_OPTIONS.map((opt) => {
        const count = alertCounts[opt.value] ?? 0;
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
    [alertCounts]
  );

  const sloStatusComboBoxOptions = useMemo(
    () =>
      SLO_STATUS_OPTIONS.map((opt) => {
        const count = sloStatusCounts[opt.value] ?? 0;
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

  const anomalyFilterComboBoxOptions = useMemo(
    () =>
      ANOMALY_SEVERITY_OPTIONS.map((opt) => {
        const count = anomalySeverityCounts[opt.value] ?? 0;
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
    [anomalySeverityCounts]
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
          defaultMessage: 'Connections',
        })}
        options={connectionFilterComboBoxOptions}
        selectedOptions={connectionFilter.map((value) => {
          const opt = connectionFilterComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onConnectionFilterChange(selected.map((s) => (s.value ?? s.label) as ConnectionFilter));
        }}
        fullWidth
        compressed
        isClearable
        data-test-subj="serviceMapConnectionFilter"
        aria-label={i18n.translate('xpack.apm.serviceMap.controls.connectionFilterAriaLabel', {
          defaultMessage: 'Filter by connection status',
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
          onAlertStatusFilterChange(selected.map((s) => (s.value ?? s.label) as AlertStatus));
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
          defaultMessage: 'SLO Status',
        })}
        options={sloStatusComboBoxOptions}
        selectedOptions={sloStatusFilter.map((value) => {
          const opt = sloStatusComboBoxOptions.find((o) => o.value === value);
          return { label: opt?.label ?? value, value };
        })}
        onChange={(selected) => {
          onSloStatusFilterChange(selected.map((s) => (s.value ?? s.label) as SloStatus));
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
          onAnomalySeverityFilterChange(
            selected.map((s) => (s.value ?? s.label) as ML_ANOMALY_SEVERITY)
          );
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
