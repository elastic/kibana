/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertStatus } from '../../../common/typings';

export interface StatusFilterProps {
  status: AlertStatus;
  onChange: (value: AlertStatus) => void;
}

const options: Array<{ id: AlertStatus; label: string }> = [
  {
    id: 'open',
    label: i18n.translate('xpack.observability.alerts.statusFilter.openButtonLabel', {
      defaultMessage: 'Open',
    }),
  },
  {
    id: 'acknowledged',
    label: i18n.translate('xpack.observability.alerts.statusFilter.acknowledgedButtonLabel', {
      defaultMessage: 'Acknowledged',
    }),
  },
  {
    id: 'closed',
    label: i18n.translate('xpack.observability.alerts.statusFilter.closedButtonLabel', {
      defaultMessage: 'Closed',
    }),
  },
];

export function StatusFilter({ status = 'open', onChange }: StatusFilterProps) {
  return (
    <EuiButtonGroup
      legend="Filter by"
      color="primary"
      options={options}
      idSelected={status}
      onChange={(id) => onChange(id as AlertStatus)}
    />
  );
}
