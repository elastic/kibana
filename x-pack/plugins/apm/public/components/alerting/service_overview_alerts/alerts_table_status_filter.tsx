/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
export const ALL_ALERTS_FILTER = 'ALL_ALERTS_FILTER';

export type AlertStatusFilterButton =
  | typeof ALERT_STATUS_ACTIVE
  | typeof ALERT_STATUS_RECOVERED
  | typeof ALL_ALERTS_FILTER;

export interface AlertStatusFilter {
  status: AlertStatusFilterButton;
  query: string;
  label: string;
}

export interface AlertStatusFilterProps {
  status: AlertStatusFilterButton;
  onChange: (id: AlertStatusFilterButton) => void;
}

export const allAlerts: AlertStatusFilter = {
  status: ALL_ALERTS_FILTER,
  query: '',
  label: i18n.translate('xpack.apm.alerts.alertStatusFilter.showAll', {
    defaultMessage: 'Show all',
  }),
};

export const activeAlerts: AlertStatusFilter = {
  status: ALERT_STATUS_ACTIVE,
  query: `${ALERT_STATUS}: "${ALERT_STATUS_ACTIVE}"`,
  label: i18n.translate('xpack.apm.alerts.alertStatusFilter.active', {
    defaultMessage: 'Active',
  }),
};

export const recoveredAlerts: AlertStatusFilter = {
  status: ALERT_STATUS_RECOVERED,
  query: `${ALERT_STATUS}: "${ALERT_STATUS_RECOVERED}"`,
  label: i18n.translate('xpack.apm.alerts.alertStatusFilter.recovered', {
    defaultMessage: 'Recovered',
  }),
};

const options: EuiButtonGroupOptionProps[] = [
  {
    id: allAlerts.status,
    label: allAlerts.label,
    value: allAlerts.query,
    'data-test-subj': 'alert-status-filter-show-all-button',
  },
  {
    id: activeAlerts.status,
    label: activeAlerts.label,
    value: activeAlerts.query,
    'data-test-subj': 'alert-status-filter-active-button',
  },
  {
    id: recoveredAlerts.status,
    label: recoveredAlerts.label,
    value: recoveredAlerts.query,
    'data-test-subj': 'alert-status-filter-recovered-button',
  },
];

export function AlertsTableStatusFilter({
  status,
  onChange,
}: AlertStatusFilterProps) {
  return (
    <EuiButtonGroup
      legend={i18n.translate(
        'xpack.apm.alerts.alertStatusFilter.button.legend',
        {
          defaultMessage: 'Filter by',
        }
      )}
      color="primary"
      options={options}
      idSelected={status}
      onChange={(id: string) => onChange(id as AlertStatusFilterButton)}
    />
  );
}
