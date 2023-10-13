/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFilterButton,
  EuiSelectable,
  EuiHorizontalRule,
  EuiPopoverTitle,
  EuiPopover,
} from '@elastic/eui';

interface FilterPopoverProps {
  buttonLabel: string;
  onSelectedOptionsChanged: (value: EuiSelectableOption[]) => void;
  options: EuiSelectableOption[];
  optionsEmptyLabel?: string;
  limit?: number;
  limitReachedMessage?: string;
  selectedOptions: EuiSelectableOption[];
}

export const FilterPopoverComponent = ({
  buttonLabel,
  onSelectedOptionsChanged,
  options,
  optionsEmptyLabel,
  selectedOptions,
  limit,
  limitReachedMessage,
}: FilterPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const toggleIsPopoverOpen = () => setIsPopoverOpen(!isPopoverOpen);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={`options-filter-popover-button-${buttonLabel}`}
          iconType="arrowDown"
          onClick={toggleIsPopoverOpen}
          isSelected={isPopoverOpen}
          numFilters={options.length}
          hasActiveFilters={selectedOptions.length > 0}
          numActiveFilters={selectedOptions.length}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={toggleIsPopoverOpen}
      panelPaddingSize="none"
      repositionOnScroll
    >
      {limit && limitReachedMessage && selectedOptions.length >= limit ? (
        <>
          <EuiHorizontalRule margin="none" />
          <EuiCallOut
            title={limitReachedMessage}
            color="warning"
            size="s"
            data-test-subj="maximum-length-warning"
          />
          <EuiHorizontalRule margin="none" />
        </>
      ) : null}
      <EuiSelectable
        options={options}
        searchable
        searchProps={{ placeholder: buttonLabel, compressed: false }}
        emptyMessage={optionsEmptyLabel}
        onChange={onSelectedOptionsChanged}
      >
        {(list, search) => (
          <div style={{ width: '200px' }}>
            <EuiPopoverTitle paddingSize="s">{options.length}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

FilterPopoverComponent.displayName = 'FilterPopoverComponent';

export const FilterPopover = React.memo(FilterPopoverComponent);

FilterPopover.displayName = 'FilterPopover';
