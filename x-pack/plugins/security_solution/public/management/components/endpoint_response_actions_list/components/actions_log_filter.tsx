/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  type ResponseActionsApiCommandNames,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { ActionsLogFilterPopover } from './actions_log_filter_popover';
import {
  type FilterItems,
  type FilterName,
  useActionsLogFilter,
  isAgentType,
  isActionType,
} from './hooks';
import { ClearAllButton } from './clear_all_button';
import { UX_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

// maps filter name to a function that updates the query state
type TypeFilters = {
  [k in Extract<FilterName, 'agentTypes' | 'type'>]: {
    onChangeFilterOptions: (selectedOptions: string[]) => void;
  };
};

export const ActionsLogFilter = memo(
  ({
    filterName,
    typeFilters,
    isFlyout,
    onChangeFilterOptions,
    'data-test-subj': dataTestSubj,
  }: {
    filterName: FilterName;
    typeFilters?: TypeFilters;
    isFlyout: boolean;
    onChangeFilterOptions?: (selectedOptions: string[]) => void;
    'data-test-subj'?: string;
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

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
      areHostsSelectedOnMount,
      isLoading,
      items,
      setItems,
      hasActiveFilters,
      numActiveFilters,
      numFilters,
      setAreHostsSelectedOnMount,
      setUrlActionsFilters,
      setUrlHostsFilters,
      setUrlStatusesFilters,
      setUrlTypesFilters,
    } = useActionsLogFilter({
      filterName,
      isFlyout,
      isPopoverOpen,
      searchString,
    });

    // track popover state to pin selected options
    const wasPopoverOpen = useRef(isPopoverOpen);
    useEffect(() => {
      return () => {
        wasPopoverOpen.current = isPopoverOpen;
      };
    }, [isPopoverOpen, wasPopoverOpen]);

    // compute if selected hosts should be pinned
    const shouldPinSelectedHosts = useCallback(
      (isNotChangingOptions: boolean = true) => {
        // case 1: when no hosts are selected initially
        return (
          isNotChangingOptions && wasPopoverOpen.current && isPopoverOpen && filterName === 'hosts'
        );
      },
      [filterName, isPopoverOpen]
    );

    // augmented options based on the host filter
    const sortedHostsFilterOptions = useMemo(() => {
      if (shouldPinSelectedHosts() || areHostsSelectedOnMount) {
        // pin checked items to the top
        return orderBy('checked', 'asc', items);
      }
      // return options as are for other filters
      return items;
    }, [areHostsSelectedOnMount, shouldPinSelectedHosts, items]);

    const isSearchable = useMemo(
      () => filterName !== 'statuses' && filterName !== 'type',
      [filterName]
    );

    const onOptionsChange = useCallback(
      (newOptions: FilterItems) => {
        // update filter UI options state
        setItems(newOptions.map((option) => option));

        // compute a selected list of options
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on') {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        const groupedSelectedTypeFilterOptions = selectedItems.reduce<{
          agentTypes: string[];
          actionTypes: string[];
        }>(
          (acc, item) => {
            if (isAgentType(item)) {
              acc.agentTypes.push(item);
            }
            if (isActionType(item)) {
              acc.actionTypes.push(item);
            }

            return acc;
          },
          { actionTypes: [], agentTypes: [] }
        );

        if (!isFlyout) {
          // update URL params
          if (filterName === 'actions') {
            setUrlActionsFilters(
              selectedItems
                .map(
                  (item) =>
                    RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[
                      item as ResponseActionsApiCommandNames
                    ]
                )
                .join()
            );
          } else if (filterName === 'hosts') {
            setUrlHostsFilters(selectedItems.join());
          } else if (filterName === 'statuses') {
            setUrlStatusesFilters(selectedItems.join());
          } else if (filterName === 'type') {
            setUrlTypesFilters({
              agentTypes: groupedSelectedTypeFilterOptions.agentTypes.join(),
              actionTypes: groupedSelectedTypeFilterOptions.actionTypes.join(),
            });
          }
          // reset shouldPinSelectedHosts, setAreHostsSelectedOnMount
          shouldPinSelectedHosts(false);
          setAreHostsSelectedOnMount(false);
        }

        // update overall query state
        if (typeFilters && typeof onChangeFilterOptions === 'undefined') {
          typeFilters.agentTypes.onChangeFilterOptions(groupedSelectedTypeFilterOptions.agentTypes);
          typeFilters.type.onChangeFilterOptions(groupedSelectedTypeFilterOptions.actionTypes);
        } else {
          if (typeof onChangeFilterOptions !== 'undefined') {
            onChangeFilterOptions(selectedItems);
          }
        }
      },
      [
        typeFilters,
        setItems,
        isFlyout,
        onChangeFilterOptions,
        filterName,
        shouldPinSelectedHosts,
        setAreHostsSelectedOnMount,
        setUrlActionsFilters,
        setUrlHostsFilters,
        setUrlStatusesFilters,
        setUrlTypesFilters,
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
        // update URL params based on filter on page
        if (filterName === 'actions') {
          setUrlActionsFilters('');
        } else if (filterName === 'hosts') {
          setUrlHostsFilters('');
        } else if (filterName === 'statuses') {
          setUrlStatusesFilters('');
        } else if (filterName === 'type') {
          setUrlTypesFilters({ agentTypes: '', actionTypes: '' });
        }
      }

      // update query state for flyout filters
      if (typeFilters && typeof onChangeFilterOptions === 'undefined') {
        typeFilters.agentTypes.onChangeFilterOptions([]);
        typeFilters.type.onChangeFilterOptions([]);
      } else {
        if (typeof onChangeFilterOptions !== 'undefined') {
          onChangeFilterOptions([]);
        }
      }
    }, [
      setItems,
      items,
      isFlyout,
      typeFilters,
      onChangeFilterOptions,
      filterName,
      setUrlActionsFilters,
      setUrlHostsFilters,
      setUrlStatusesFilters,
      setUrlTypesFilters,
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
        data-test-subj={dataTestSubj}
      >
        <EuiSelectable
          aria-label={`${filterName}`}
          emptyMessage={UX_MESSAGES.filterEmptyMessage(filterName)}
          isLoading={isLoading}
          onChange={onOptionsChange}
          options={sortedHostsFilterOptions}
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
