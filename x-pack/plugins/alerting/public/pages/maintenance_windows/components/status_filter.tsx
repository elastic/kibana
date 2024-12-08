/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiFilterSelectItem } from '@elastic/eui';
import { STATUS_OPTIONS } from '../constants';
import * as i18n from '../translations';
import { MaintenanceWindowStatus } from '../../../../common';

export interface RuleStatusFilterProps {
  selectedStatuses: MaintenanceWindowStatus[];
  onChange: (selectedStatuses: MaintenanceWindowStatus[]) => void;
}

export const StatusFilter: React.FC<RuleStatusFilterProps> = React.memo(({ selectedStatuses, onChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = useCallback(
    (newOption: MaintenanceWindowStatus) => () => {
      const options = selectedStatuses.includes(newOption)
        ? selectedStatuses.filter((option) => option !== newOption)
        : [...selectedStatuses, newOption];
      onChange(options);
    },
    [onChange, selectedStatuses]
  );

  const openPopover = useCallback(() => {
    setIsPopoverOpen((prevIsOpen) => !prevIsOpen);
  }, [setIsPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        button={
          <EuiFilterButton
            data-test-subj="status-filter-button"
            iconType="arrowDown"
            hasActiveFilters={selectedStatuses.length > 0}
            numActiveFilters={selectedStatuses.length}
            numFilters={selectedStatuses.length}
            onClick={openPopover}
          >
            {i18n.TABLE_STATUS}
          </EuiFilterButton>
        }
      >
        <>
          {STATUS_OPTIONS.map((status) => {
            return (
              <EuiFilterSelectItem // use EuiSelectable
                key={status.value}
                data-test-subj={`status-filter-${status.value}`}
                onClick={onFilterItemClick(status.value)}
                checked={selectedStatuses.includes(status.value) ? 'on' : undefined}
              >
                {status.name}
              </EuiFilterSelectItem>
            );
          })}
        </>
      </EuiPopover>
    </EuiFilterGroup>
  );
});

StatusFilter.displayName = 'StatusFilter';
