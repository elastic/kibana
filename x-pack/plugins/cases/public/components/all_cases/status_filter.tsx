/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import { CaseStatuses } from '../../../common/types/domain';
import { allCaseStatus, statuses } from '../status';
import type { CaseStatusWithAllStatus, FilterOptions } from '../../../common/ui/types';
import { StatusAll } from '../../../common/ui/types';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  hiddenStatuses?: CaseStatusWithAllStatus[];
  onChange: ({ filterId, options }: { filterId: keyof FilterOptions; options: string[] }) => void;
  selectedOptions: string[];
}

const AllStatusBadge = () => {
  return (
    <EuiBadge data-test-subj="status-badge-all" color={allCaseStatus[StatusAll].color}>
      {allCaseStatus[StatusAll].label}
    </EuiBadge>
  );
};

AllStatusBadge.displayName = 'AllStatusBadge';

const caseStatuses = Object.keys(statuses) as CaseStatusWithAllStatus[];

export const StatusFilterComponent = ({
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  hiddenStatuses = [],
  onChange,
  selectedOptions,
}: Props) => {
  const stats = useMemo(
    () => ({
      [StatusAll]: null,
      [CaseStatuses.open]: countOpenCases ?? 0,
      [CaseStatuses['in-progress']]: countInProgressCases ?? 0,
      [CaseStatuses.closed]: countClosedCases ?? 0,
    }),
    [countClosedCases, countInProgressCases, countOpenCases]
  );
  const options: CaseStatusWithAllStatus[] = useMemo(
    () => [StatusAll, ...caseStatuses].filter((status) => !hiddenStatuses.includes(status)),
    [hiddenStatuses]
  );
  const renderOption = (option: EuiSelectableOption) => {
    const selectedStatus = (option?.label || 'all') as CaseStatusWithAllStatus;
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={1}>
          <span>
            {selectedStatus === 'all' ? <AllStatusBadge /> : <Status status={selectedStatus} />}
          </span>
        </EuiFlexItem>
        {selectedStatus !== StatusAll && (
          <EuiFlexItem grow={false}>{` (${stats[selectedStatus]})`}</EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };
  return (
    <MultiSelectFilter
      buttonLabel={i18n.STATUS}
      id={'status'}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      selectedOptions={selectedOptions}
    />
  );
};

StatusFilterComponent.displayName = 'StatusFilterComponent';

export const StatusFilter = React.memo(StatusFilterComponent);
