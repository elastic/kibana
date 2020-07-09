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
import React, { MouseEvent, useCallback, useEffect, useState } from 'react';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { I18LABELS } from '../translations';

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
  items,
}: BreakdownGroupProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [activeItems, setActiveItems] = useState<BreakdownItem[]>(items);

  useEffect(() => {
    setActiveItems(items);
  }, [items]);

  const getSelItems = () => activeItems.filter((item) => item.selected);

  const onFilterItemClick = useCallback(
    (name: string) => (_event: MouseEvent<HTMLButtonElement>) => {
      setActiveItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          selected: name === item.name ? !item.selected : item.selected,
        }))
      );
    },
    []
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={
          <EuiFilterButton
            isDisabled={disabled && getSelItems().length === 0}
            isSelected={getSelItems().length > 0}
            numFilters={activeItems.length}
            numActiveFilters={getSelItems().length}
            hasActiveFilters={getSelItems().length !== 0}
            iconType="arrowDown"
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            size="s"
          >
            {I18LABELS.breakdown}
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
        <EuiPopoverTitle>{I18LABELS.selectBreakdown}</EuiPopoverTitle>
        <div className="euiFilterSelect__items" style={{ minWidth: 200 }}>
          {activeItems.map(({ name, count, selected }) => (
            <EuiFilterSelectItem
              checked={!!selected ? 'on' : undefined}
              data-cy={`filter-breakdown-item_${name}`}
              key={name + count}
              onClick={onFilterItemClick(name)}
              disabled={!selected && getSelItems().length > 0}
            >
              {name}
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
