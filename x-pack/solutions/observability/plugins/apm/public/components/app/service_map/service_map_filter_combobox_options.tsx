/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import {
  ALERT_STATUS_VALUES,
  ANOMALY_SEVERITY_VALUES,
  CONNECTION_VALUES,
  SLO_STATUS_VALUES,
  type AlertStatusValue,
  type AnomalySeverityValue,
  type ConnectionValue,
  type SloStatusValue,
} from '../../../../common/embeddable/service_map_embeddable_schema';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ConnectionFilter } from './apply_service_map_visibility';
import type { ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';

// The allowed values are single-sourced in `common/` (runtime schema validation) and consumed
// below to build the UI options, so a value can't pass the UI but fail dashboard-save validation,
// or vice versa (review #14). The `Record<XxxValue, string>` label maps below also force every
// shared value to have a label (a missing one is a compile error).

/**
 * Static option lists for the four view-filter comboboxes, driven by the shared value arrays in
 * `common/`. Lifted out of `service_map_options_panel.tsx` so the embeddable edit flyout can reuse
 * them without dragging the panel UI into a circular import.
 */
const CONNECTION_LABELS: Record<ConnectionValue, string> = {
  orphaned: i18n.translate('xpack.apm.serviceMap.controls.connectionOrphaned', {
    defaultMessage: 'No dependencies',
  }),
  connected: i18n.translate('xpack.apm.serviceMap.controls.connectionConnected', {
    defaultMessage: 'With dependencies',
  }),
};
export const CONNECTION_FILTER_OPTIONS: Array<{ value: ConnectionFilter; label: string }> =
  CONNECTION_VALUES.map((value) => ({ value, label: CONNECTION_LABELS[value] }));

const ALERT_STATUS_LABELS: Record<AlertStatusValue, string> = {
  active: i18n.translate('xpack.apm.serviceMap.controls.alertStatusActive', {
    defaultMessage: 'Active',
  }),
  recovered: i18n.translate('xpack.apm.serviceMap.controls.alertStatusRecovered', {
    defaultMessage: 'Recovered',
  }),
  untracked: i18n.translate('xpack.apm.serviceMap.controls.alertStatusUntracked', {
    defaultMessage: 'Untracked',
  }),
  delayed: i18n.translate('xpack.apm.serviceMap.controls.alertStatusDelayed', {
    defaultMessage: 'Delayed',
  }),
};
export const ALERT_STATUS_OPTIONS: Array<{ value: AlertStatus; label: string }> =
  ALERT_STATUS_VALUES.map((value) => ({
    value: value as AlertStatus,
    label: ALERT_STATUS_LABELS[value],
  }));

const SLO_STATUS_LABELS: Record<SloStatusValue, string> = {
  healthy: i18n.translate('xpack.apm.serviceMap.controls.sloHealthy', {
    defaultMessage: 'Healthy',
  }),
  degrading: i18n.translate('xpack.apm.serviceMap.controls.sloDegrading', {
    defaultMessage: 'Degrading',
  }),
  violated: i18n.translate('xpack.apm.serviceMap.controls.sloViolated', {
    defaultMessage: 'Violated',
  }),
  noData: i18n.translate('xpack.apm.serviceMap.controls.sloNoData', {
    defaultMessage: 'No data',
  }),
};
export const SLO_STATUS_OPTIONS: Array<{ value: SloStatus; label: string }> = SLO_STATUS_VALUES.map(
  (value) => ({ value, label: SLO_STATUS_LABELS[value] })
);

const ANOMALY_SEVERITY_LABELS: Record<AnomalySeverityValue, string> = {
  critical: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityCritical', {
    defaultMessage: 'Critical',
  }),
  major: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityMajor', {
    defaultMessage: 'Major',
  }),
  minor: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityMinor', {
    defaultMessage: 'Minor',
  }),
  warning: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityWarning', {
    defaultMessage: 'Warning',
  }),
  low: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityLow', {
    defaultMessage: 'Low',
  }),
  unknown: i18n.translate('xpack.apm.serviceMap.controls.anomalySeverityUnknown', {
    defaultMessage: 'Unknown',
  }),
};
export const ANOMALY_SEVERITY_OPTIONS: Array<{ value: ML_ANOMALY_SEVERITY; label: string }> =
  ANOMALY_SEVERITY_VALUES.map((value) => ({
    value: value as ML_ANOMALY_SEVERITY,
    label: ANOMALY_SEVERITY_LABELS[value],
  }));

interface DecoratedOption<V extends string> {
  label: string;
  value: V;
  append: ReactElement;
  disabled: boolean;
}

function withCountBadge<V extends string>(
  opt: { label: string; value: V },
  count: number
): DecoratedOption<V> {
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
}

/** Decorate connection-filter options with `(count)` badges + disable zero-count entries. */
export function getDecoratedConnectionOptions(
  counts: ServiceMapFilterOptionCounts['connection']
): Array<DecoratedOption<ConnectionFilter>> {
  return CONNECTION_FILTER_OPTIONS.map((opt) =>
    withCountBadge(opt, opt.value === 'orphaned' ? counts.orphaned : counts.connected)
  );
}

/** Decorate alert-status options with `(count)` badges + disable zero-count entries. */
export function getDecoratedAlertStatusOptions(
  counts: ServiceMapFilterOptionCounts['alerts']
): Array<DecoratedOption<AlertStatus>> {
  return ALERT_STATUS_OPTIONS.map((opt) => withCountBadge(opt, counts[opt.value] ?? 0));
}

/** Decorate SLO-status options with `(count)` badges + disable zero-count entries. */
export function getDecoratedSloStatusOptions(
  counts: ServiceMapFilterOptionCounts['slo']
): Array<DecoratedOption<SloStatus>> {
  return SLO_STATUS_OPTIONS.map((opt) => withCountBadge(opt, counts[opt.value] ?? 0));
}

/** Decorate anomaly-severity options with `(count)` badges + disable zero-count entries. */
export function getDecoratedAnomalySeverityOptions(
  counts: ServiceMapFilterOptionCounts['anomaly']
): Array<DecoratedOption<ML_ANOMALY_SEVERITY>> {
  return ANOMALY_SEVERITY_OPTIONS.map((opt) => withCountBadge(opt, counts[opt.value] ?? 0));
}
