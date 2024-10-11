/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiPopoverTitle, EuiSelectable } from '@elastic/eui';

import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import {
  METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP,
  type MetricTypes,
} from '../../../../common/rest_types';

import { UX_LABELS } from '../../translations';
import { ChartsFilterPopover } from './charts_filter_popover';
import { FilterItems, FilterName, useChartsFilter } from '../../hooks/use_charts_filter';

const getSearchPlaceholder = (filterName: FilterName) => {
  if (filterName === 'dataStreams') {
    return UX_LABELS.filterSearchPlaceholder('data streams');
  }
  return UX_LABELS.filterSearchPlaceholder('metric types');
};

export const ChartsFilter = memo(
  ({
    filterName,
    onChangeFilterOptions,
    'data-test-subj': dataTestSubj,
  }: {
    filterName: FilterName;
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
      areDataStreamsSelectedOnMount,
      isLoading,
      items,
      setItems,
      hasActiveFilters,
      numActiveFilters,
      numFilters,
      setAreDataStreamsSelectedOnMount,
      setUrlDataStreamsFilter,
      setUrlMetricTypesFilter,
    } = useChartsFilter({
      filterName,
      searchString,
    });

    // track popover state to pin selected options
    const wasPopoverOpen = useRef(isPopoverOpen);
    useEffect(() => {
      return () => {
        wasPopoverOpen.current = isPopoverOpen;
      };
    }, [isPopoverOpen, wasPopoverOpen]);

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
    const sortedHostsFilterOptions = useMemo(() => {
      if (shouldPinSelectedDataStreams() || areDataStreamsSelectedOnMount) {
        // pin checked items to the top
        return orderBy('checked', 'asc', items);
      }
      // return options as are for other filters
      return items;
    }, [areDataStreamsSelectedOnMount, shouldPinSelectedDataStreams, items]);

    const isSearchable = useMemo(() => filterName !== 'metricTypes', [filterName]);

    const onOptionsChange = useCallback(
      (newOptions: FilterItems) => {
        // update filter UI options state
        setItems(newOptions.map((option) => option));

        // compute a selected list of options
        const selectedItems = newOptions.reduce<string[]>((acc, curr) => {
          if (curr.checked === 'on' && curr.key) {
            acc.push(curr.key);
          }
          return acc;
        }, []);

        // update URL params
        if (filterName === 'metricTypes') {
          setUrlMetricTypesFilter(
            selectedItems
              .map((item) => METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP[item as MetricTypes])
              .join()
          );
        } else if (filterName === 'dataStreams') {
          setUrlDataStreamsFilter(selectedItems.join());
        }
        // reset shouldPinSelectedDataStreams, setAreDataStreamsSelectedOnMount
        shouldPinSelectedDataStreams(false);
        setAreDataStreamsSelectedOnMount(false);

        // update overall query state
        if (typeof onChangeFilterOptions !== 'undefined') {
          onChangeFilterOptions(selectedItems);
        }
      },
      [
        setItems,
        filterName,
        shouldPinSelectedDataStreams,
        setAreDataStreamsSelectedOnMount,
        onChangeFilterOptions,
        setUrlMetricTypesFilter,
        setUrlDataStreamsFilter,
      ]
    );

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
          isLoading={isLoading}
          onChange={onOptionsChange}
          options={sortedHostsFilterOptions}
          searchable={isSearchable ? true : undefined}
          searchProps={{
            placeholder: getSearchPlaceholder(filterName),
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
              </div>
            );
          }}
        </EuiSelectable>
      </ChartsFilterPopover>
    );
  }
);

ChartsFilter.displayName = 'ChartsFilter';
