/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import { ACTIVE_ALERTS, ALL_ALERTS, RECOVERED_ALERTS, UNTRACKED_ALERTS } from './constants';

export interface AlertStatusFilterProps {
  status: AlertStatus;
  onChange: (id: AlertStatus) => void;
}

const options: EuiButtonGroupOptionProps[] = [
  {
    id: ALL_ALERTS.status,
    label: ALL_ALERTS.label,
    value: ALL_ALERTS.query,
    'data-test-subj': 'hostsView-alert-status-filter-show-all-button',
  },
  {
    id: ACTIVE_ALERTS.status,
    label: ACTIVE_ALERTS.label,
    value: ACTIVE_ALERTS.query,
    'data-test-subj': 'hostsView-alert-status-filter-active-button',
  },
  {
    id: RECOVERED_ALERTS.status,
    label: RECOVERED_ALERTS.label,
    value: RECOVERED_ALERTS.query,
    'data-test-subj': 'hostsView-alert-status-filter-recovered-button',
  },
  {
    id: UNTRACKED_ALERTS.status,
    label: UNTRACKED_ALERTS.label,
    value: UNTRACKED_ALERTS.query,
    'data-test-subj': 'hostsView-alert-status-filter-untracked-button',
  },
];

export function AlertsStatusFilter({ status, onChange }: AlertStatusFilterProps) {
  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.legend', {
        defaultMessage: 'Filter by',
      })}
      color="primary"
      options={options}
      idSelected={status}
      onChange={(id) => onChange(id as AlertStatus)}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsStatusFilter;
