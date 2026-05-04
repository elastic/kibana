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
  EuiFlexItem,
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
import type { ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
import { ServiceMapFindInPage } from './service_map_find_in_page';

export type ServiceMapOrientation = 'horizontal' | 'vertical';

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

export interface ServiceMapOptionsPanelProps {
  nodes: ServiceMapNode[];
  filterOptionCounts: ServiceMapFilterOptionCounts;
  alertStatusFilter: AlertStatus[];
  onAlertStatusFilterChange: (next: AlertStatus[]) => void;
  sloStatusFilter: SloStatus[];
  onSloStatusFilterChange: (next: SloStatus[]) => void;
  anomalySeverityFilter: ML_ANOMALY_SEVERITY[];
  onAnomalySeverityFilterChange: (next: ML_ANOMALY_SEVERITY[]) => void;
  mapOrientation: ServiceMapOrientation;
  onMapOrientationChange: (next: ServiceMapOrientation) => void;
  isExpanded: boolean;
  onExpandedChange: (next: boolean) => void;
}

export function ServiceMapOptionsPanel({
  nodes,
  filterOptionCounts,
  alertStatusFilter,
  onAlertStatusFilterChange,
  sloStatusFilter,
  onSloStatusFilterChange,
  anomalySeverityFilter,
  onAnomalySeverityFilterChange,
  mapOrientation,
  onMapOrientationChange,
  isExpanded,
  onExpandedChange,
}: ServiceMapOptionsPanelProps) {
  const { euiTheme } = useEuiTheme();

  const alertCounts = filterOptionCounts.alerts;
  const sloStatusCounts = filterOptionCounts.slo;
  const anomalySeverityCounts = filterOptionCounts.anomaly;

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

  /** Same hit target as map zoom / fit controls in graph.tsx (2 × base size). */
  const mapToolbarToggleIconCss = useMemo(
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

  const toggleLabel = isExpanded
    ? i18n.translate('xpack.apm.serviceMap.controls.hideControls', {
        defaultMessage: 'Hide controls',
      })
    : i18n.translate('xpack.apm.serviceMap.controls.showControls', {
        defaultMessage: 'Show controls',
      });

  if (!isExpanded) {
    return (
      <EuiPanel
        data-test-subj="serviceMapOptionsPanel"
        hasBorder
        hasShadow={false}
        paddingSize="none"
        borderRadius="m"
        grow={false}
      >
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          gutterSize="none"
          responsive={false}
        >
          <EuiButtonIcon
            display="empty"
            color="text"
            size="s"
            iconType="transitionLeftIn"
            css={mapToolbarToggleIconCss}
            onClick={() => onExpandedChange(true)}
            aria-expanded={false}
            title={toggleLabel}
            aria-label={toggleLabel}
            data-test-subj="serviceMapShowControlsButton"
          />
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

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
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            display="empty"
            color="text"
            size="s"
            iconType="transitionLeftOut"
            css={mapToolbarToggleIconCss}
            onClick={() => onExpandedChange(false)}
            aria-expanded={true}
            title={toggleLabel}
            aria-label={toggleLabel}
            data-test-subj="serviceMapHideControlsButton"
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <ServiceMapFindInPage nodes={nodes} />
        </EuiFlexItem>
      </EuiFlexGroup>

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
