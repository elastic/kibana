/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
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

    // popover states and handlers
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const onPopoverButtonClick = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [setIsPopoverOpen, isPopoverOpen]);
    const onClosePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);

    // search string state
    const [searchString, setSearchString] = useState('');
    const {
      isLoading,
      items,
      setItems,
      hasActiveFilters,
      numActiveFilters,
      numFilters,
      setUrlActionsFilters,
      setUrlHostsFilters,
      setUrlStatusesFilters,
    } = useActionsLogFilter({
      filterName,
      isFlyout,
      isPopoverOpen,
      searchString,
    });

    const isSearchable = useMemo(() => filterName !== 'statuses', [filterName]);

    const onOptionsChange = useCallback(
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
          } else if (filterName === 'hosts') {
            setUrlHostsFilters(selectedItems.join());
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
        setUrlHostsFilters,
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
        // update URL params based on filter
        if (filterName === 'actions') {
          setUrlActionsFilters('');
        } else if (filterName === 'hosts') {
          setUrlHostsFilters('');
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
      setUrlHostsFilters,
      setUrlStatusesFilters,
    ]);

    return (
      <ActionsLogFilterPopover
        closePopover={onClosePopover}
        filterName={filterName}
        hasActiveFilters={hasActiveFilters}
        isPopoverOpen={isPopoverOpen}
        numActiveFilters={numActiveFilters}
        numFilters={numFilters}
        onButtonClick={onPopoverButtonClick}
      >
        <EuiSelectable
          aria-label={`${filterName}`}
          emptyMessage={UX_MESSAGES.filterEmptyMessage(filterName)}
          isLoading={isLoading}
          onChange={onOptionsChange}
          options={items}
          searchable={isSearchable ? true : undefined}
          searchProps={{
            placeholder: UX_MESSAGES.filterSearchPlaceholder(filterName),
            compressed: true,
            onChange: (searchValue) => setSearchString(searchValue.trim()),
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
