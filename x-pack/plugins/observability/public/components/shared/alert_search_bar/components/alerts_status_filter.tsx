/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import React from 'react';
import { ALL_ALERTS, ACTIVE_ALERTS, RECOVERED_ALERTS } from '../constants';
import { AlertStatusFilterProps } from '../types';

const options: EuiButtonGroupOptionProps[] = [
  {
    id: ALL_ALERTS.status,
    label: ALL_ALERTS.label,
    value: ALL_ALERTS.query,
    'data-test-subj': 'alert-status-filter-show-all-button',
  },
  {
    id: ACTIVE_ALERTS.status,
    label: ACTIVE_ALERTS.label,
    value: ACTIVE_ALERTS.query,
    'data-test-subj': 'alert-status-filter-active-button',
  },
  {
    id: RECOVERED_ALERTS.status,
    label: RECOVERED_ALERTS.label,
    value: RECOVERED_ALERTS.query,
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
