/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';

interface FilterPopoverProps {
  buttonLabel: string;
  onSelectedOptionsChanged: (value: string[]) => void;
  options: string[];
  optionsEmptyLabel?: string;
  limit?: number;
  limitReachedMessage?: string;
  selectedOptions: string[];
}

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
  limit,
  limitReachedMessage,
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
      <div
        css={css`
          max-height: 250px;
          overflow: auto;
        `}
      >
        {options.map((option, index) => (
          <EuiFilterSelectItem
            checked={selectedOptions.includes(option) ? 'on' : undefined}
            disabled={Boolean(
              limit && selectedOptions.length >= limit && !selectedOptions.includes(option)
            )}
            data-test-subj={`options-filter-popover-item-${option}`}
            key={`${index}-${option}`}
            onClick={toggleSelectedGroupCb.bind(null, option)}
          >
            {option}
          </EuiFilterSelectItem>
        ))}
      </div>
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
