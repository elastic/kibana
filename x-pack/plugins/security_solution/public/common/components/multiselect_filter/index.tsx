/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { noop } from 'lodash';
import type { EuiSelectableProps, FilterChecked } from '@elastic/eui';
import { EuiPopover, EuiFilterButton, EuiSelectable } from '@elastic/eui';
import { useBoolState } from '../../hooks/use_bool_state';

export interface MultiselectFilterProps<T = unknown> {
  dataTestSubj?: string;
  title: string;
  items: T[];
  selectedItems: T[];
  onSelectionChange?: (selectedItems: T[], changedOption: T, changedStatus: FilterChecked) => void;
  renderItem?: (item: T) => React.ReactChild;
  renderLabel?: (item: T) => string;
  /**
   * Width of the popover content. If undefined, the popover will take the width of the button.
   *  https://eui.elastic.co/#/forms/selectable#sizing-and-containers
   */
  width?: number;
}

interface MultiselectFilterOption<T> {
  originalItem: T;
  label: string;
  checked?: FilterChecked;
}

const MultiselectFilterComponent = <T extends unknown>({
  dataTestSubj = 'multiselectFilter',
  title,
  items,
  selectedItems,
  width,
  onSelectionChange = noop,
  renderLabel = String,
  renderItem = renderLabel,
}: MultiselectFilterProps<T>) => {
  const [isPopoverOpen, _unused, closePopover, togglePopover] = useBoolState();

  const options: Array<MultiselectFilterOption<T>> = useMemo(() => {
    const checked: FilterChecked = 'on';
    return items.map((item) => ({
      originalItem: item,
      label: renderLabel(item),
      checked: selectedItems.includes(item) ? checked : undefined,
    }));
  }, [items, renderLabel, selectedItems]);

  const onChange = useCallback<
    NonNullable<EuiSelectableProps<MultiselectFilterOption<T>>['onChange']>
  >(
    (newItems, _event, changedOption) => {
      onSelectionChange(
        newItems.filter(({ checked }) => checked === 'on').map(({ originalItem }) => originalItem),
        changedOption.originalItem,
        changedOption.checked ?? 'off'
      );
    },
    [onSelectionChange]
  );

  return (
    <EuiPopover
      data-test-subj={`${dataTestSubj}-popover`}
      button={
        <EuiFilterButton
          data-test-subj={`${dataTestSubj}-popoverButton`}
          iconType="arrowDown"
          grow={false}
          numFilters={items.length}
          numActiveFilters={selectedItems.length}
          hasActiveFilters={selectedItems.length > 0}
          isSelected={isPopoverOpen}
          onClick={togglePopover}
        >
          {title}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiSelectable
        data-test-subj={`${dataTestSubj}-item`}
        onChange={onChange}
        options={options}
        renderOption={({ originalItem }) => renderItem(originalItem)}
      >
        {(list) => <div style={{ width }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const MultiselectFilter = React.memo(
  MultiselectFilterComponent
) as typeof MultiselectFilterComponent; // The cast is necessary because React.memo does not support generics
