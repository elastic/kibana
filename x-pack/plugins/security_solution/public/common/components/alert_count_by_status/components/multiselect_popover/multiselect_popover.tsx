/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFilterSelectItem, EuiPopover } from '@elastic/eui';
export interface MultiSelectPopoverProps {
  title: string;
  allItems: readonly string[];
  selectedItems: string[];
  onSelectedItemsChange: (newItems: string[]) => void;
}

export const MultiSelectPopover = React.memo(
  ({ allItems, selectedItems, title, onSelectedItemsChange }: MultiSelectPopoverProps) => {
    const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);

    const onChange = useCallback(
      (item: string) => onSelectedItemsChange(getUpdatedSelectedItems(item, selectedItems)),
      [selectedItems, onSelectedItemsChange]
    );

    const itemList = useMemo(() => {
      return allItems.map((item, index) => (
        <EuiFilterSelectItem
          checked={selectedItems.includes(item) ? 'on' : undefined}
          key={`${index}-${item}`}
          onClick={() => onChange(item)}
          title={item}
        >
          {item}
        </EuiFilterSelectItem>
      ));
    }, [allItems, selectedItems, onChange]);

    const togglePopover = useCallback(
      (toState?: boolean) => {
        setIsItemPopoverOpen((s) => (toState ? toState : !s));
      },
      [setIsItemPopoverOpen]
    );

    return (
      <EuiPopover
        ownFocus
        button={
          <EuiFilterGroup>
            <EuiFilterButton
              grow={false}
              data-test-subj={'multiselect-popover-button'}
              iconType="arrowDown"
              onClick={() => togglePopover()}
              numFilters={allItems.length}
              isSelected={isItemPopoverOpen}
              hasActiveFilters={selectedItems.length > 0}
              numActiveFilters={selectedItems.length}
            >
              {title}
            </EuiFilterButton>
          </EuiFilterGroup>
        }
        isOpen={isItemPopoverOpen}
        closePopover={() => togglePopover(false)}
        panelPaddingSize="none"
      >
        {itemList}
      </EuiPopover>
    );
  }
);

MultiSelectPopover.displayName = 'MultiSelectPopover';

const getUpdatedSelectedItems = (item: string, selectedItems: string[]): string[] => {
  const selectedGroupIndex = selectedItems.indexOf(item);
  const updatedSelectedItems = [...selectedItems];
  if (selectedGroupIndex >= 0) {
    updatedSelectedItems.splice(selectedGroupIndex, 1);
  } else {
    updatedSelectedItems.push(item);
  }
  return updatedSelectedItems;
};
