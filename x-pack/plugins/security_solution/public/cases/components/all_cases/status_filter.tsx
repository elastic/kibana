/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiSuperSelect, EuiSuperSelectOption, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CaseStatus } from '../../../../../case/common/api';
import { Status, statuses } from '../status';

interface Props {
  stats: Record<CaseStatus, number>;
  selectedStatus: CaseStatus;
  onStatusChanged: (status: CaseStatus) => void;
}

const StatusFilterComponent: React.FC<Props> = ({ stats, selectedStatus, onStatusChanged }) => {
  const caseStatuses = Object.keys(statuses) as CaseStatus[];
  const options: Array<EuiSuperSelectOption<CaseStatus>> = caseStatuses.map((status) => ({
    value: status,
    inputDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <Status type={status} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{`(${stats[status]})`}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));

  return (
    <EuiSuperSelect options={options} valueOfSelected={selectedStatus} onChange={onStatusChanged} />
  );
};

export const StatusFilter = memo(StatusFilterComponent);
