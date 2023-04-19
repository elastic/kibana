/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiFilterSelectItem } from '@elastic/eui';
import { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import { STATUS_OPTIONS } from '../constants';
import * as i18n from '../translations';

export const StatusFilter: React.FC<CustomComponentProps> = React.memo(({ query, onChange }) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = useCallback(
    (newOption: string) => () => {
      const options = selectedOptions.includes(newOption)
        ? selectedOptions.filter((option) => option !== newOption)
        : [...selectedOptions, newOption];
      setSelectedOptions(options);

      let q = query.removeSimpleFieldClauses('status').removeOrFieldClauses('status');
      if (options.length > 0) {
        q = options.reduce((acc, curr) => {
          return acc.addOrFieldValue('status', curr, true, 'eq');
        }, q);
      }
      onChange?.(q);
    },
    [query, onChange, selectedOptions]
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
            hasActiveFilters={selectedOptions.length > 0}
            numActiveFilters={selectedOptions.length}
            numFilters={selectedOptions.length}
            onClick={openPopover}
          >
            {i18n.TABLE_STATUS}
          </EuiFilterButton>
        }
      >
        <>
          {STATUS_OPTIONS.map((status) => {
            return (
              <EuiFilterSelectItem
                key={status.value}
                data-test-subj={`status-filter-${status.value}`}
                onClick={onFilterItemClick(status.value)}
                checked={selectedOptions.includes(status.value) ? 'on' : undefined}
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
