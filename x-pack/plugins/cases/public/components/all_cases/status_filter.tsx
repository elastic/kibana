/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiPopover,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiFilterButton,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import { allCaseStatus, statuses } from '../status';
import type { CaseStatusWithAllStatus } from '../../../common/ui/types';
import { StatusAll } from '../../../common/ui/types';

interface Props {
  stats: Record<CaseStatusWithAllStatus, number | null>;
  selectedStatus: CaseStatusWithAllStatus;
  onStatusChanged: (status: CaseStatusWithAllStatus) => void;
  hiddenStatuses?: CaseStatusWithAllStatus[];
}

const AllStatusBadge = () => {
  return (
    <EuiBadge data-test-subj="status-badge-all" color={allCaseStatus[StatusAll].color}>
      {allCaseStatus[StatusAll].label}
    </EuiBadge>
  );
};

AllStatusBadge.displayName = 'AllStatusBadge';

const StatusFilterComponent: React.FC<Props> = ({
  stats,
  selectedStatus,
  onStatusChanged,
  hiddenStatuses = [],
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen(!isPopoverOpen);
  const caseStatuses = Object.keys(statuses) as CaseStatusWithAllStatus[];
  const options = [StatusAll, ...caseStatuses]
    .filter((status) => !hiddenStatuses.includes(status))
    .map((option) => ({ label: option }));

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={`options-filter-popover-button-status`}
          iconType="arrowDown"
          onClick={toggleIsPopoverOpen}
          isSelected={isPopoverOpen}
          numFilters={options.length}
          // hasActiveFilters={selectedOptions.length > 0}
          hasActiveFilters={false}
          // numActiveFilters={selectedOptions.length}
          numActiveFilters={0}
          aria-label={'status'}
        >
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
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={toggleIsPopoverOpen}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        options={options}
        searchable
        searchProps={{ placeholder: 'status', compressed: false }}
        emptyMessage={'empty'}
        onChange={(param) => console.log(param)}
        renderOption={({ label }, searchValue) => {
          return (
            <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
              <EuiFlexItem grow={1}>
                <span>
                  {label === 'all' ? (
                    <AllStatusBadge />
                  ) : (
                    <Status status={label} dataTestSubj={`case-status-filter-${label}`} />
                  )}
                </span>
              </EuiFlexItem>
              {label !== StatusAll && (
                <EuiFlexItem grow={false}>{` (${stats[label]})`}</EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        }}
      >
        {(list, search) => <div style={{ width: '200px' }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

StatusFilterComponent.displayName = 'StatusFilter';

export const StatusFilter = memo(StatusFilterComponent);
