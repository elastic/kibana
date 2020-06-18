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
  EuiFacetButton,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { LoadingLabel, SearchBreakdownLabel } from './translations';
import { BreakdownItem } from '../../../../typings/ui_filters';

export interface FilterPopoverProps {
  fieldName: string;
  id: string;
  loading: boolean;
  disabled?: boolean;
  items: BreakdownItem[];
  onChange: (values: BreakdownItem[]) => void;
  title: string;
}

export const BreakdownGroup = ({
  id,
  disabled,
  loading,
  items: allItems,
  onChange,
  title,
}: FilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');

  const [items, setItems] = useState<BreakdownItem[]>(allItems || []);

  useEffect(() => {
    setItems(allItems);
  }, [allItems]);

  const getSelItems = () => items.filter((tItem) => !!tItem.selected);

  const getItemsToDisplay = () =>
    items.filter(
      (tItem) =>
        tItem.name.toLowerCase().indexOf(query.toLocaleLowerCase()) >= 0
    );

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
            {title}
          </EuiFilterButton>
        }
        closePopover={() => {
          setIsOpen(false);
          onChange(getSelItems());
        }}
        data-test-subj={`filter-popover_${id}`}
        id={id}
        isOpen={isOpen}
        ownFocus={true}
        withTitle
        zIndex={10000}
      >
        <EuiPopoverTitle>
          <EuiFieldSearch
            incremental={true}
            disabled={items.length === 0}
            onSearch={(tQuery) => setQuery(tQuery)}
            placeholder={loading ? LoadingLabel : SearchBreakdownLabel}
          />
        </EuiPopoverTitle>
        <div className="euiFilterSelect__items">
          {!loading &&
            getItemsToDisplay().map(({ name, count, selected }) => (
              <EuiFilterSelectItem
                checked={!!selected ? 'on' : undefined}
                data-test-subj={`filter-breakdown-item_${name}`}
                key={name + count}
                onClick={() =>
                  setItems((prevItems) =>
                    prevItems.map((tItem) => ({
                      ...tItem,
                      selected:
                        name === tItem.name && count === tItem.count
                          ? !tItem.selected
                          : tItem.selected,
                    }))
                  )
                }
              >
                <EuiFacetButton
                  quantity={count}
                  icon={<EuiIcon size="s" type="visMapCoordinate" />}
                >
                  {name}
                </EuiFacetButton>
              </EuiFilterSelectItem>
            ))}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
