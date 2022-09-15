/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelectable, EuiPopoverTitle } from '@elastic/eui';
import type { ResponseActions } from '../../../../../common/endpoint/service/response_actions/constants';
import { ActionsLogFilterPopover } from './actions_log_filter_popover';
import { type FilterItems, type FilterName, useActionsLogFilter, getUiCommand } from './hooks';
import { ClearAllButton } from './clear_all_button';
import { UX_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ActionsLogFilter = memo(
  ({
    filterName,
    isFlyout,
    onChangeFilterOptions,
  }: {
    filterName: FilterName;
    isFlyout: boolean;
    onChangeFilterOptions: (selectedOptions: string[]) => void;
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
    const {
      items,
      setItems,
      hasActiveFilters,
      numActiveFilters,
      numFilters,
      setUrlActionsFilters,
      setUrlStatusesFilters,
    } = useActionsLogFilter(filterName, isFlyout);

    const isSearchable = useMemo(() => filterName !== 'statuses', [filterName]);

    const onChange = useCallback(
      (newOptions: FilterItems) => {
        // update filter UI options state
        setItems(newOptions.map((option) => option));

        // compute selected list of options
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on') {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        if (!isFlyout) {
          // update URL params
          if (filterName === 'actions') {
            setUrlActionsFilters(
              selectedItems.map((item) => getUiCommand(item as ResponseActions)).join()
            );
          } else if (filterName === 'statuses') {
            setUrlStatusesFilters(selectedItems.join());
          }
        }

        // update query state
        onChangeFilterOptions(selectedItems);
      },
      [
        filterName,
        isFlyout,
        setItems,
        onChangeFilterOptions,
        setUrlActionsFilters,
        setUrlStatusesFilters,
      ]
    );

    // clear all selected options
    const onClearAll = useCallback(() => {
      // update filter UI options state
      setItems(
        items.map((option) => {
          option.checked = undefined;
          return option;
        })
      );

      if (!isFlyout) {
        // update URL params
        if (filterName === 'actions') {
          setUrlActionsFilters('');
        } else if (filterName === 'statuses') {
          setUrlStatusesFilters('');
        }
      }
      // update query state
      onChangeFilterOptions([]);
    }, [
      filterName,
      isFlyout,
      items,
      setItems,
      onChangeFilterOptions,
      setUrlActionsFilters,
      setUrlStatusesFilters,
    ]);

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
          searchable={isSearchable ? true : undefined}
          searchProps={{
            placeholder: UX_MESSAGES.filterSearchPlaceholder(filterName),
            compressed: true,
          }}
        >
          {(list, search) => {
            return (
              <div
                style={{ width: 300 }}
                data-test-subj={getTestId(`${filterName}-filter-popoverList`)}
              >
                {isSearchable && (
                  <EuiPopoverTitle
                    data-test-subj={getTestId(`${filterName}-filter-search`)}
                    paddingSize="s"
                  >
                    {search}
                  </EuiPopoverTitle>
                )}
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
            );
          }}
        </EuiSelectable>
      </ActionsLogFilterPopover>
    );
  }
);

ActionsLogFilter.displayName = 'ActionsLogFilter';
