/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, ALERT_STATUS } from '@kbn/rule-data-utils';
import { AlertStatusFilterButton } from '../../../../common/typings';
import { AlertStatusFilter } from '../../../../common/typings';

export interface AlertStatusFilterProps {
  status: AlertStatusFilterButton;
  onChange: (id: string, value: string) => void;
}

export const allAlerts: AlertStatusFilter = {
  status: '',
  query: '',
  label: i18n.translate('xpack.observability.alerts.alertStatusFilter.showAll', {
    defaultMessage: 'Show all',
  }),
};

export const activeAlerts: AlertStatusFilter = {
  status: ALERT_STATUS_ACTIVE,
  query: `${ALERT_STATUS}: "${ALERT_STATUS_ACTIVE}"`,
  label: i18n.translate('xpack.observability.alerts.alertStatusFilter.active', {
    defaultMessage: 'Active',
  }),
};

export const recoveredAlerts: AlertStatusFilter = {
  status: ALERT_STATUS_RECOVERED,
  query: `${ALERT_STATUS}: "${ALERT_STATUS_RECOVERED}"`,
  label: i18n.translate('xpack.observability.alerts.alertStatusFilter.recovered', {
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

export function AlertsStatusFilter({ status, onChange }: AlertStatusFilterProps) {
  return (
    <EuiButtonGroup
      legend="Filter by"
      color="primary"
      options={options}
      idSelected={status}
      onChange={onChange}
    />
  );
}
