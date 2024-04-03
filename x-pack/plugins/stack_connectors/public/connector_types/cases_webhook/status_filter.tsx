/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CaseStatuses } from '@kbn/cases-components';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';

import * as i18n from './translations';

interface Props {
  selectedStatus: CaseStatuses;
  onStatusChanged: (status: CaseStatuses) => void;
}

export const caseStatuses = [CaseStatuses.open, CaseStatuses['in-progress'], CaseStatuses.closed];
export const statuses = {
  [CaseStatuses.open]: {
    color: 'primary',
    label: i18n.STATUS_OPEN,
  },
  [CaseStatuses['in-progress']]: {
    color: 'warning',
    label: i18n.STATUS_IN_PROGRESS,
  },
  [CaseStatuses.closed]: {
    color: 'default',
    label: i18n.STATUS_CLOSED,
  },
} as const;

export const StatusFilter: React.FC<Props> = ({ selectedStatus, onStatusChanged }) => {
  const options: Array<EuiSuperSelectOption<CaseStatuses>> = caseStatuses.map((status) => ({
    value: status,
    inputDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={false}>
          <span>
            <EuiBadge
              data-test-subj={`case-status-badge-${status}`}
              color={statuses[status]?.color}
            >
              {statuses[status]?.label}
            </EuiBadge>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': `case-status-filter-${status}`,
  }));

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={selectedStatus}
      onChange={onStatusChanged}
      data-test-subj="case-status-filter"
      fullWidth={true}
    />
  );
};

StatusFilter.displayName = 'StatusFilter';
