/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useCallback } from 'react';
import { EuiSelectable, EuiPopoverTitle } from '@elastic/eui';
import { ActionListFilterPopover } from './action_list_filter_popover';
import { type FilterItems, type FilterName, useActionListFilter } from './hooks';

const getFilterName = (name: string) =>
  i18n.translate('xpack.securitySolution.responseActionsList.list.filterName', {
    defaultMessage: `{name}`,
    values: { name },
  });

export const ActionListFilter = memo(
  ({
    filterName,
    onChangeCommands,
    onChangeUserIds,
  }: {
    filterName: FilterName;
    onChangeCommands: (selectedCommands: string[]) => void;
    onChangeUserIds: (selectedUsers: string[]) => void;
  }) => {
    const translatedFilterName = getFilterName(filterName);
    const { items, setItems, hasActiveFilters, numActiveFilters, numFilters } =
      useActionListFilter(filterName);

    const onChange = useCallback(
      (newOptions: FilterItems) => {
        setItems(newOptions.map((e) => e));

        // update selected filter state
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on') {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        // update query state
        if (filterName === 'Commands') {
          onChangeCommands(selectedItems);
        } else if (filterName === 'Users') {
          onChangeUserIds(selectedItems);
        }
      },
      [filterName, onChangeCommands, onChangeUserIds, setItems]
    );

    return (
      <ActionListFilterPopover
        filterName={translatedFilterName}
        hasActiveFilters={hasActiveFilters}
        numActiveFilters={numActiveFilters}
        numFilters={numFilters}
      >
        <EuiSelectable
          aria-label={`${translatedFilterName}`}
          onChange={onChange}
          options={items}
          searchable
          searchProps={{
            placeholder: `Filter ${translatedFilterName}`,
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
