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

export interface AlertStatusFilterProps {
  status: AlertStatusFilterButton;
  onChange: (id: AlertStatusFilterButton) => void;
}

const options: EuiButtonGroupOptionProps[] = [
  {
    id: ALL_ALERTS_FILTER,
    value: '',
    label: i18n.translate('xpack.apm.alerts.alertStatusFilter.showAll', {
      defaultMessage: 'Show all',
    }),
    'data-test-subj': 'alert-status-filter-show-all-button',
  },
  {
    id: ALERT_STATUS_ACTIVE,
    value: `${ALERT_STATUS}: "${ALERT_STATUS_RECOVERED}"`,
    label: i18n.translate('xpack.apm.alerts.alertStatusFilter.active', {
      defaultMessage: 'Active',
    }),
    'data-test-subj': 'alert-status-filter-active-button',
  },
  {
    id: ALERT_STATUS_RECOVERED,
    value: `${ALERT_STATUS}: "${ALERT_STATUS_RECOVERED}"`,
    label: i18n.translate('xpack.apm.alerts.alertStatusFilter.recovered', {
      defaultMessage: 'Recovered',
    }),
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
