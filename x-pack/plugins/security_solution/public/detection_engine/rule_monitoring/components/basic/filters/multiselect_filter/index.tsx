/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { noop } from 'lodash';
import { EuiPopover, EuiFilterGroup, EuiFilterButton, EuiFilterSelectItem } from '@elastic/eui';
import { useBoolState } from '../../../../../../common/hooks/use_bool_state';

/* eslint-disable react/no-unused-prop-types */
export interface MultiselectFilterProps<T = unknown> {
  dataTestSubj?: string;
  title: string;
  items: T[];
  selectedItems: T[];
  onSelectionChange?: (selectedItems: T[]) => void;
  renderItem?: (item: T) => React.ReactChild;
  renderLabel?: (item: T) => string;
}
/* eslint-enable react/no-unused-prop-types */

/**
 * @deprecated Please use [MultiselectFilter](../../../../../../common/components/multiselect_filter/index.tsx) instead.
 */
const MultiselectFilterComponent = <T extends unknown>(props: MultiselectFilterProps<T>) => {
  const { dataTestSubj, title, items, selectedItems, onSelectionChange, renderItem, renderLabel } =
    initializeProps(props);

  const [isPopoverOpen, , closePopover, togglePopover] = useBoolState();

  const handleItemClick = useCallback(
    (item: T) => {
      const newSelectedItems = selectedItems.includes(item)
        ? selectedItems.filter((i) => i !== item)
        : [...selectedItems, item];
      onSelectionChange(newSelectedItems);
    },
    [selectedItems, onSelectionChange]
  );

  const filterItemElements = useMemo(() => {
    return items.map((item, index) => {
      const itemLabel = renderLabel(item);
      const itemElement = renderItem(item);
      return (
        <EuiFilterSelectItem
          data-test-subj={`${dataTestSubj}-item`}
          title={itemLabel}
          key={`${index}-${itemLabel}`}
          checked={selectedItems.includes(item) ? 'on' : undefined}
          onClick={() => handleItemClick(item)}
        >
          {itemElement}
        </EuiFilterSelectItem>
      );
    });
  }, [dataTestSubj, items, selectedItems, renderItem, renderLabel, handleItemClick]);

  return (
    <EuiFilterGroup data-test-subj={dataTestSubj}>
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
        {filterItemElements}
      </EuiPopover>
    </EuiFilterGroup>
  );
};

// We have to wrap it in a function and cast to original type because React.memo
// returns a component type which is not generic.
const enhanceMultiselectFilterComponent = () => {
  const Component = React.memo(MultiselectFilterComponent);
  Component.displayName = 'MultiselectFilter';
  return Component as typeof MultiselectFilterComponent;
};

export const MultiselectFilter = enhanceMultiselectFilterComponent();

const initializeProps = <T extends unknown>(
  props: MultiselectFilterProps<T>
): Required<MultiselectFilterProps<T>> => {
  const onSelectionChange: (selectedItems: T[]) => void = props.onSelectionChange ?? noop;
  const renderLabel: (item: T) => string = props.renderLabel ?? String;
  const renderItem: (item: T) => React.ReactChild = props.renderItem ?? renderLabel;

  return {
    dataTestSubj: props.dataTestSubj ?? 'multiselectFilter',
    title: props.title,
    items: props.items,
    selectedItems: props.selectedItems,
    onSelectionChange,
    renderLabel,
    renderItem,
  };
};
