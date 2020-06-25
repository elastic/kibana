/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPopover,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopoverTitle,
  EuiFilterSelectItem,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { SelectBreakdownLabel } from '../translations';

export interface BreakdownGroupProps {
  id: string;
  disabled?: boolean;
  items: BreakdownItem[];
  onChange: (values: BreakdownItem[]) => void;
}

export const BreakdownGroup = ({
  id,
  disabled,
  onChange,
  items: allItems,
}: BreakdownGroupProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [items, setItems] = useState<BreakdownItem[]>(allItems);

  useEffect(() => {
    setItems(allItems);
  }, [allItems]);

  const getSelItems = () => items.filter((tItem) => !!tItem.selected);

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={
          <EuiFilterButton
            isDisabled={disabled && getSelItems().length === 0}
            isSelected={getSelItems().length > 0}
            numFilters={items.length}
            numActiveFilters={getSelItems().length}
            hasActiveFilters={getSelItems().length !== 0}
            iconType="arrowDown"
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            size="s"
          >
            Breakdown
          </EuiFilterButton>
        }
        closePopover={() => {
          setIsOpen(false);
          onChange(getSelItems());
        }}
        data-cy={`breakdown-popover_${id}`}
        id={id}
        isOpen={isOpen}
        ownFocus={true}
        withTitle
        zIndex={10000}
      >
        <EuiPopoverTitle>{SelectBreakdownLabel}</EuiPopoverTitle>
        <div className="euiFilterSelect__items" style={{ minWidth: 200 }}>
          {items
            .filter(({ type }) => type === 'category')
            .map(({ name, count, selected, type, fieldName }) => (
              <EuiFilterSelectItem
                checked={!!selected ? 'on' : undefined}
                data-cy={`filter-breakdown-item_${name}`}
                key={name + count}
                onClick={() => {
                  setItems((prevItems) =>
                    prevItems.map((tItem) => ({
                      ...tItem,
                      selected:
                        name === tItem.name && count === tItem.count
                          ? !tItem.selected
                          : tItem.selected,
                    }))
                  );
                }}
              >
                {name}
              </EuiFilterSelectItem>
            ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
