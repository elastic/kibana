/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelectable, EuiPopoverTitle } from '@elastic/eui';
import { ActionsLogFilterPopover } from './actions_log_filter_popover';
import { type FilterItems, type FilterName, useActionsLogFilter } from './hooks';
import { ClearAllButton } from './clear_all_button';
import { UX_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ActionsLogFilter = memo(
  ({
    filterName,
    onChangeCommandsFilter,
  }: {
    filterName: FilterName;
    onChangeCommandsFilter: (selectedCommands: string[]) => void;
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
    const { items, setItems, hasActiveFilters, numActiveFilters, numFilters } =
      useActionsLogFilter();

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
        onChangeCommandsFilter(selectedItems);
      },
      [onChangeCommandsFilter, setItems]
    );

    // clear all selected options
    const onClearAll = useCallback(() => {
      setItems(
        items.map((e) => {
          e.checked = undefined;
          return e;
        })
      );
      onChangeCommandsFilter([]);
    }, [items, setItems, onChangeCommandsFilter]);

    return (
      <ActionsLogFilterPopover
        filterName={filterName}
        hasActiveFilters={hasActiveFilters}
        numActiveFilters={numActiveFilters}
        numFilters={numFilters}
      >
        <EuiSelectable
          aria-label={`${filterName}`}
          onChange={onChange}
          options={items}
          searchable
          searchProps={{
            placeholder: UX_MESSAGES.filterSearchPlaceholder(filterName),
            compressed: true,
          }}
        >
          {(list, search) => (
            <div
              style={{ width: 300 }}
              data-test-subj={getTestId(`${filterName}-filter-popoverList`)}
            >
              <EuiPopoverTitle
                data-test-subj={getTestId(`${filterName}-filter-search`)}
                paddingSize="s"
              >
                {search}
              </EuiPopoverTitle>
              {list}
              <EuiFlexGroup>
                <EuiFlexItem>
                  <ClearAllButton
                    data-test-subj={getTestId(`${filterName}-filter-clearAllButton`)}
                    isDisabled={!hasActiveFilters}
                    onClick={onClearAll}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          )}
        </EuiSelectable>
      </ActionsLogFilterPopover>
    );
  }
);

ActionsLogFilter.displayName = 'ActionsLogFilter';
