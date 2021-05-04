/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type Status = 'all' | 'open' | 'closed';

export interface StatusFilterProps {
  status: Status;
  onChange: (value: Status) => void;
}

export function StatusFilter({ status = 'open', onChange }: StatusFilterProps) {
  return (
    <EuiFilterGroup>
      <EuiFilterButton
        hasActiveFilters={status === 'all'}
        onClick={() => onChange('all')}
        withNext={true}
      >
        {i18n.translate('xpack.observability.alerts.statusFilter.allButtonLabel', {
          defaultMessage: 'All',
        })}
      </EuiFilterButton>
      <EuiFilterButton
        hasActiveFilters={status === 'open'}
        onClick={() => onChange('open')}
        withNext={true}
      >
        {i18n.translate('xpack.observability.alerts.statusFilter.activeButtonLabel', {
          defaultMessage: 'Active',
        })}
      </EuiFilterButton>
      <EuiFilterButton hasActiveFilters={status === 'closed'} onClick={() => onChange('closed')}>
        {i18n.translate('xpack.observability.alerts.statusFilter.recoveredButtonLabel', {
          defaultMessage: 'Recovered',
        })}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
}
