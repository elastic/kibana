/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSuperSelect, EuiSuperSelectOption, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Status, statuses } from '../status';
import { CaseStatusWithAllStatus, StatusAll } from '../../../common/ui/types';

interface Props {
  stats: Record<CaseStatusWithAllStatus, number | null>;
  selectedStatus: CaseStatusWithAllStatus;
  onStatusChanged: (status: CaseStatusWithAllStatus) => void;
  hiddenStatuses?: CaseStatusWithAllStatus[];
}

const StatusFilterComponent: React.FC<Props> = ({
  stats,
  selectedStatus,
  onStatusChanged,
  hiddenStatuses = [],
}) => {
  const caseStatuses = Object.keys(statuses) as CaseStatusWithAllStatus[];
  const options: Array<EuiSuperSelectOption<CaseStatusWithAllStatus>> = [StatusAll, ...caseStatuses]
    .filter((status) => !hiddenStatuses.includes(status))
    .map((status) => ({
      value: status,
      inputDisplay: (
        <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
          <EuiFlexItem grow={false}>
            <span>
              <Status type={status} />
            </span>
          </EuiFlexItem>
          {status !== StatusAll && <EuiFlexItem grow={false}>{` (${stats[status]})`}</EuiFlexItem>}
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
    />
  );
};
StatusFilterComponent.displayName = 'StatusFilter';

export const StatusFilter = memo(StatusFilterComponent);
