/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiSelectable, EuiPopoverTitle } from '@elastic/eui';
import { ActionListFilterPopover } from './action_list_filter_popover';
import { type FilterItems, useActionListFilter } from './hooks';

export const ActionListFilter = memo(
  ({
    filterName,
    onChangeCommands,
    onChangeUserIds,
  }: {
    filterName: string;
    onChangeCommands: (selectedCommands: string[]) => void;
    onChangeUserIds: (selectedUsers: string[]) => void;
  }) => {
    const { items, setItems, hasActiveFilters, numActiveFilters, numFilters } =
      useActionListFilter(filterName);

    const onChange = useCallback(
      (newOptions: FilterItems) => {
        // don't do the intermediate x state, either a check or none
        setItems(newOptions.map((e) => (e.checked === 'off' ? { ...e, checked: undefined } : e)));

        // update selected filter state
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on') {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        // update query state
        if (filterName === 'commands') {
          onChangeCommands(selectedItems);
        } else if (filterName === 'users') {
          onChangeUserIds(selectedItems);
        }
      },
      [filterName, onChangeCommands, onChangeUserIds, setItems]
    );

    return (
      <ActionListFilterPopover
        filterName={filterName}
        hasActiveFilters={hasActiveFilters}
        numActiveFilters={numActiveFilters}
        numFilters={numFilters}
      >
        <EuiSelectable
          allowExclusions
          aria-label={`${filterName}`}
          onChange={onChange}
          options={items}
          searchable
          searchProps={{
            placeholder: `Filter ${filterName}`,
            compressed: true,
          }}
        >
          {(list, search) => (
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </ActionListFilterPopover>
    );
  }
);

ActionListFilter.displayName = 'ActionListFilter';
