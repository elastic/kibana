/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import styled from 'styled-components';

import type { Solution } from '../all_cases/types';

interface FilterPopoverProps {
  buttonLabel: string;
  onSelectedOptionsChanged: (value: string[]) => void;
  options: string[] | Solution[];
  optionsEmptyLabel?: string;
  selectedOptions: string[];
}

const ScrollableDiv = styled.div`
  max-height: 250px;
  overflow: auto;
`;

const Icon = styled(EuiIcon)`
  padding-right: 4px;
`;

const toggleSelectedGroup = (group: string, selectedGroups: string[]): string[] => {
  const selectedGroupIndex = selectedGroups.indexOf(group);
  if (selectedGroupIndex >= 0) {
    return [
      ...selectedGroups.slice(0, selectedGroupIndex),
      ...selectedGroups.slice(selectedGroupIndex + 1),
    ];
  }
  return [...selectedGroups, group];
};

/**
 * Popover for selecting a field to filter on
 *
 * @param buttonLabel label on dropdwon button
 * @param onSelectedOptionsChanged change listener to be notified when option selection changes
 * @param options to display for filtering
 * @param optionsEmptyLabel shows when options empty
 * @param selectedOptions manage state of selectedOptions
 */
export const FilterPopoverComponent = ({
  buttonLabel,
  onSelectedOptionsChanged,
  options,
  optionsEmptyLabel,
  selectedOptions,
}: FilterPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const setIsPopoverOpenCb = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const toggleSelectedGroupCb = useCallback(
    (option) => onSelectedOptionsChanged(toggleSelectedGroup(option, selectedOptions)),
    [selectedOptions, onSelectedOptionsChanged]
  );

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={`options-filter-popover-button-${buttonLabel}`}
          iconType="arrowDown"
          onClick={setIsPopoverOpenCb}
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
      closePopover={setIsPopoverOpenCb}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <ScrollableDiv>
        {options.map((option, index) =>
          typeof option === 'string' ? (
            <EuiFilterSelectItem
              checked={selectedOptions.includes(option) ? 'on' : undefined}
              data-test-subj={`options-filter-popover-item-${option}`}
              key={`${index}-${option}`}
              onClick={toggleSelectedGroupCb.bind(null, option)}
            >
              {option}
            </EuiFilterSelectItem>
          ) : (
            <EuiFilterSelectItem
              checked={selectedOptions.includes(option.id) ? 'on' : undefined}
              data-test-subj={`options-filter-popover-item-${option.id}`}
              key={`${index}-${option.id}`}
              onClick={toggleSelectedGroupCb.bind(null, option.id)}
            >
              <span>
                <Icon size="m" type={option.iconType} title={option.label} />
                {option.label}
              </span>
            </EuiFilterSelectItem>
          )
        )}
      </ScrollableDiv>
      {options.length === 0 && optionsEmptyLabel != null && (
        <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
          <EuiFlexItem grow={true}>
            <EuiPanel>
              <EuiText>{optionsEmptyLabel}</EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
};

FilterPopoverComponent.displayName = 'FilterPopoverComponent';

export const FilterPopover = React.memo(FilterPopoverComponent);

FilterPopover.displayName = 'FilterPopover';
