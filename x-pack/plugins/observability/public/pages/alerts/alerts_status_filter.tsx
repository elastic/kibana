/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AlertStatus, AlertStatusFilter } from '../../../common/typings';

export interface AlertStatusFilterProps {
  status: AlertStatus;
  onChange: (id: string, value: string) => void;
}

export const allAlerts: AlertStatusFilter = {
  status: AlertStatus.All,
  query: '',
  label: i18n.translate('xpack.observability.alerts.workflowStatusFilter.openButtonLabel', {
    defaultMessage: 'Show all',
  }),
};

export const activeAlerts: AlertStatusFilter = {
  status: AlertStatus.Active,
  query: `kibana.alert.status : "active"`,
  label: i18n.translate('xpack.observability.alerts.workflowStatusFilter.acknowledgedButtonLabel', {
    defaultMessage: 'Active',
  }),
};

export const recoveredAlerts: AlertStatusFilter = {
  status: AlertStatus.Recovered,
  query: `kibana.alert.status : "recovered"`,
  label: i18n.translate('xpack.observability.alerts.workflowStatusFilter.closedButtonLabel', {
    defaultMessage: 'Recovered',
  }),
};

const options: EuiButtonGroupOptionProps[] = [
  {
    id: allAlerts.status,
    label: allAlerts.label,
    value: allAlerts.query,
    'data-test-subj': 'workflow-status-filter-open-button',
  },
  {
    id: activeAlerts.status,
    label: activeAlerts.label,
    value: activeAlerts.query,
    'data-test-subj': 'workflow-status-filter-acknowledged-button',
  },
  {
    id: recoveredAlerts.status,
    label: recoveredAlerts.label,
    value: recoveredAlerts.query,
    'data-test-subj': 'workflow-status-filter-closed-button',
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
