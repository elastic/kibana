/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertStatus } from '@kbn/rule-data-utils';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ConnectionFilter } from './apply_service_map_visibility';
import type { ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';

/**
 * Static option lists for the four view-filter comboboxes. Lifted out of
 * `service_map_options_panel.tsx` so the embeddable edit flyout can reuse them
 * without dragging the panel UI into a circular import.
 */
export const CONNECTION_FILTER_OPTIONS: Array<{ value: ConnectionFilter; label: string }> = [
  {
    value: 'orphaned',
    label: i18n.translate('xpack.apm.serviceMap.controls.connectionOrphaned', {
      defaultMessage: 'No dependencies',
    }),
  },
  {
    value: 'connected',
    label: i18n.translate('xpack.apm.serviceMap.controls.connectionConnected', {
      defaultMessage: 'With dependencies',
    }),
  },
];

export const ALERT_STATUS_OPTIONS: Array<{ value: AlertStatus; label: string }> = [
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

export const SLO_STATUS_OPTIONS: Array<{ value: SloStatus; label: string }> = [
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

export const ANOMALY_SEVERITY_OPTIONS: Array<{ value: ML_ANOMALY_SEVERITY; label: string }> = [
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

interface DecoratedOption<V extends string> {
  label: string;
  value: V;
  append: JSX.Element;
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
