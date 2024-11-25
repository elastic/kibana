/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy, findKey } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiPopoverTitle, EuiSelectable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP } from '../../../../common/rest_types';
import { UX_LABELS } from '../../../translations';
import { ChartsFilterPopover } from './charts_filter_popover';
import { ToggleAllButton } from './toggle_all_button';
import { FilterItems, FilterName, useChartsFilter } from '../../hooks';

const getSearchPlaceholder = (filterName: FilterName) => {
  if (filterName === 'dataStreams') {
    return UX_LABELS.filterSearchPlaceholder('data streams');
  }
  return UX_LABELS.filterSearchPlaceholder('metric types');
};

export interface ChartsFilterProps {
  filterOptions: {
    filterName: FilterName;
    options: string[];
    appendOptions?: Record<string, number>;
    selectedOptions?: string[];
    onChangeFilterOptions: (selectedOptions: string[]) => void;
    isFilterLoading?: boolean;
  };
  'data-test-subj'?: string;
}

export const ChartsFilter = memo<ChartsFilterProps>(
  ({
    filterOptions: {
      filterName,
      options,
      appendOptions,
      selectedOptions,
      onChangeFilterOptions,
      isFilterLoading = false,
    },
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isMetricsFilter = filterName === 'metricTypes';
    const isDataStreamsFilter = filterName === 'dataStreams';

    // popover states and handlers
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const onPopoverButtonClick = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [setIsPopoverOpen, isPopoverOpen]);
    const onClosePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);

    const {
      areDataStreamsSelectedOnMount,
      items,
      setItems,
      hasActiveFilters,
      numActiveFilters,
      numFilters,
      setAreDataStreamsSelectedOnMount,
      setUrlDataStreamsFilter,
      setUrlMetricTypesFilter,
    } = useChartsFilter({
      filterOptions: {
        filterName,
        options,
        appendOptions,
        selectedOptions,
        onChangeFilterOptions,
        isFilterLoading,
      },
    });

    const addHeightToPopover = useMemo(
      () => isDataStreamsFilter && numFilters + numActiveFilters > 15,
      [isDataStreamsFilter, numFilters, numActiveFilters]
    );

    // track popover state to pin selected options
    const wasPopoverOpen = useRef(isPopoverOpen);

    // compute if selected dataStreams should be pinned
    const shouldPinSelectedDataStreams = useCallback(
      (isNotChangingOptions: boolean = true) => {
        // case 1: when no dataStreams are selected initially
        return (
          isNotChangingOptions &&
          wasPopoverOpen.current &&
          isPopoverOpen &&
          filterName === 'dataStreams'
        );
      },
      [filterName, isPopoverOpen]
    );

    // augmented options based on the dataStreams filter
    const sortedDataStreamsFilterOptions = useMemo(() => {
      if (shouldPinSelectedDataStreams() || areDataStreamsSelectedOnMount) {
        // pin checked items to the top
        return orderBy('checked', 'asc', items);
      }
      // return options as are for other filters
      return items;
    }, [areDataStreamsSelectedOnMount, shouldPinSelectedDataStreams, items]);

    const isSearchable = useMemo(() => !isMetricsFilter, [isMetricsFilter]);

    const onOptionsChange = useCallback(
      (newOptions: FilterItems) => {
        const optionItemsToSet = newOptions.map((option) => option);

        // update filter UI options state
        setItems(optionItemsToSet);

        // compute a selected list of options
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on' && curr.key) {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        // update URL params
        if (isMetricsFilter) {
          setUrlMetricTypesFilter(selectedItems.join(','));
        } else if (isDataStreamsFilter) {
          setUrlDataStreamsFilter(selectedItems.join(','));
        }
        // reset shouldPinSelectedDataStreams, setAreDataStreamsSelectedOnMount
        shouldPinSelectedDataStreams(false);
        setAreDataStreamsSelectedOnMount(false);

        onChangeFilterOptions(selectedItems);
      },
      [
        setItems,
        isMetricsFilter,
        isDataStreamsFilter,
        shouldPinSelectedDataStreams,
        setAreDataStreamsSelectedOnMount,
        onChangeFilterOptions,
        setUrlMetricTypesFilter,
        setUrlDataStreamsFilter,
      ]
    );

    const onSelectAll = useCallback(() => {
      const allItems: FilterItems = items.map((item) => {
        return {
          ...item,
          checked: 'on',
        };
      });
      setItems(allItems);
      const optionsToSelect = allItems.map((i) => i.label);
      onChangeFilterOptions(optionsToSelect);

      if (isDataStreamsFilter) {
        setUrlDataStreamsFilter(optionsToSelect.join(','));
      }
      if (isMetricsFilter) {
        setUrlMetricTypesFilter(
          optionsToSelect
            .map((option) => findKey(METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP, option))
            .join(',')
        );
      }
    }, [
      items,
      isDataStreamsFilter,
      isMetricsFilter,
      setItems,
      onChangeFilterOptions,
      setUrlDataStreamsFilter,
      setUrlMetricTypesFilter,
    ]);

    const onClearAll = useCallback(() => {
      setItems(
        items.map((item) => {
          return {
            ...item,
            checked: undefined,
          };
        })
      );
      onChangeFilterOptions([]);
      if (isDataStreamsFilter) {
        setUrlDataStreamsFilter('');
      }
      if (isMetricsFilter) {
        setUrlMetricTypesFilter('');
      }
    }, [
      items,
      isDataStreamsFilter,
      isMetricsFilter,
      setItems,
      onChangeFilterOptions,
      setUrlDataStreamsFilter,
      setUrlMetricTypesFilter,
    ]);

    useEffect(() => {
      return () => {
        wasPopoverOpen.current = isPopoverOpen;
      };
    }, [isPopoverOpen, wasPopoverOpen]);

    return (
      <ChartsFilterPopover
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
          emptyMessage={UX_LABELS.filterEmptyMessage(filterName)}
          height={addHeightToPopover ? 380 : undefined}
          isLoading={isFilterLoading}
          onChange={onOptionsChange}
          options={sortedDataStreamsFilterOptions}
          searchable={isSearchable ? true : undefined}
          searchProps={{
            placeholder: getSearchPlaceholder(filterName),
            compressed: true,
          }}
        >
          {(list, search) => {
            return (
              <div style={{ width: 300 }} data-test-subj={getTestId(`${filterName}-popoverList`)}>
                {isSearchable && (
                  <EuiPopoverTitle
                    data-test-subj={getTestId(`${filterName}-search`)}
                    paddingSize="s"
                  >
                    {search}
                  </EuiPopoverTitle>
                )}
                {list}
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={1}>
                    <ToggleAllButton
                      color="primary"
                      data-test-subj={getTestId(`${filterName}-selectAllButton`)}
                      icon="check"
                      label={UX_LABELS.filterSelectAll}
                      isDisabled={hasActiveFilters && numFilters === 0}
                      onClick={onSelectAll}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>
                    <ToggleAllButton
                      color="danger"
                      data-test-subj={getTestId(`${filterName}-clearAllButton`)}
                      icon="cross"
                      label={UX_LABELS.filterClearAll}
                      isDisabled={!hasActiveFilters}
                      onClick={onClearAll}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            );
          }}
        </EuiSelectable>
      </ChartsFilterPopover>
    );
  }
);

ChartsFilter.displayName = 'ChartsFilter';
