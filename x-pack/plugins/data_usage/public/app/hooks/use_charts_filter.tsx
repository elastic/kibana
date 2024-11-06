/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  isDefaultMetricType,
  METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP,
  METRIC_TYPE_VALUES,
} from '../../../common/rest_types';
import { useGetDataUsageDataStreams } from '../../hooks/use_get_data_streams';
import { FILTER_NAMES } from '../translations';
import { useDataUsageMetricsUrlParams } from './use_charts_url_params';

export type FilterName = keyof typeof FILTER_NAMES;

export type FilterItems = Array<{
  key?: string;
  label: string;
  isGroupLabel?: boolean;
  checked?: 'on' | undefined;
  'data-test-subj'?: string;
}>;

export const useChartsFilter = ({
  filterName,
  searchString,
}: {
  filterName: FilterName;
  searchString: string;
}): {
  areDataStreamsSelectedOnMount: boolean;
  isLoading: boolean;
  items: FilterItems;
  setItems: React.Dispatch<React.SetStateAction<FilterItems>>;
  hasActiveFilters: boolean;
  numActiveFilters: number;
  numFilters: number;
  setAreDataStreamsSelectedOnMount: (value: React.SetStateAction<boolean>) => void;
  setUrlDataStreamsFilter: ReturnType<
    typeof useDataUsageMetricsUrlParams
  >['setUrlDataStreamsFilter'];
  setUrlMetricTypesFilter: ReturnType<
    typeof useDataUsageMetricsUrlParams
  >['setUrlMetricTypesFilter'];
} => {
  const {
    dataStreams: selectedDataStreamsFromUrl,
    setUrlMetricTypesFilter,
    setUrlDataStreamsFilter,
  } = useDataUsageMetricsUrlParams();
  const isMetricTypesFilter = filterName === 'metricTypes';
  const isDataStreamsFilter = filterName === 'dataStreams';
  const { data: dataStreams, isFetching } = useGetDataUsageDataStreams({
    searchString,
    selectedDataStreams: selectedDataStreamsFromUrl,
  });

  // track the state of selected data streams via URL
  //  when the page is loaded via selected data streams on URL
  const [areDataStreamsSelectedOnMount, setAreDataStreamsSelectedOnMount] =
    useState<boolean>(false);

  useEffect(() => {
    if (selectedDataStreamsFromUrl && selectedDataStreamsFromUrl.length > 0) {
      setAreDataStreamsSelectedOnMount(true);
    }
    // don't sync with changes to further selectedDataStreamsFromUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filter options
  const [items, setItems] = useState<FilterItems>(
    isMetricTypesFilter
      ? METRIC_TYPE_VALUES.map((metricType) => ({
          key: metricType,
          label: METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP[metricType],
          checked: isDefaultMetricType(metricType) ? 'on' : undefined, // default metrics are selected by default
          disabled: isDefaultMetricType(metricType),
          'data-test-subj': `${filterName}-filter-option`,
        }))
      : []
  );

  useEffect(() => {
    if (isDataStreamsFilter && dataStreams) {
      setItems(
        dataStreams?.map((dataStream) => ({
          key: dataStream.name,
          label: dataStream.name,
          checked: dataStream.selected ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      );
    }
  }, [dataStreams, filterName, isDataStreamsFilter, setItems]);

  const hasActiveFilters = useMemo(() => !!items.find((item) => item.checked === 'on'), [items]);
  const numActiveFilters = useMemo(
    () => items.filter((item) => item.checked === 'on').length,
    [items]
  );
  const numFilters = useMemo(
    () => items.filter((item) => item.key && item.checked !== 'on').length,
    [items]
  );

  return {
    areDataStreamsSelectedOnMount,
    isLoading: isDataStreamsFilter && isFetching,
    items,
    setItems,
    hasActiveFilters,
    numActiveFilters,
    numFilters,
    setAreDataStreamsSelectedOnMount,
    setUrlMetricTypesFilter,
    setUrlDataStreamsFilter,
  };
};
