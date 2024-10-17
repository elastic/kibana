/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiCallOut } from '@elastic/eui';
import { Charts } from './charts';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { PLUGIN_NAME } from '../../../common';
import { useGetDataUsageMetrics } from '../../hooks/use_get_usage_metrics';
import { useDataUsageMetricsUrlParams } from '../hooks/use_charts_url_params';
import { DEFAULT_DATE_RANGE_OPTIONS, useDateRangePicker } from '../hooks/use_date_picker';
import { DEFAULT_METRIC_TYPES, UsageMetricsRequestBody } from '../../../common/rest_types';
import { ChartFilters, ChartFiltersProps } from './filters/charts_filters';
import { UX_LABELS } from '../translations';
import { useGetDataUsageDataStreams } from '../../hooks/use_get_data_streams';

const EuiItemCss = css`
  width: 100%;
`;

const FlexItemWithCss = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem css={EuiItemCss}>{children}</EuiFlexItem>
);

export const DataUsageMetrics = () => {
  const {
    services: { chrome, appParams },
  } = useKibanaContextForPlugin();
  useBreadcrumbs([{ text: PLUGIN_NAME }], appParams, chrome);

  const {
    metricTypes: metricTypesFromUrl,
    dataStreams: dataStreamsFromUrl,
    startDate: startDateFromUrl,
    endDate: endDateFromUrl,
    setUrlMetricTypesFilter,
    setUrlDataStreamsFilter,
    setUrlDateRangeFilter,
  } = useDataUsageMetricsUrlParams();

  const { data: dataStreams, isFetching: isFetchingDataStreams } = useGetDataUsageDataStreams({
    selectedDataStreams: dataStreamsFromUrl,
    options: {
      enabled: true,
    },
  });

  const [metricsFilters, setMetricsFilters] = useState<UsageMetricsRequestBody>({
    metricTypes: [...DEFAULT_METRIC_TYPES],
    dataStreams: [],
    from: DEFAULT_DATE_RANGE_OPTIONS.startDate,
    to: DEFAULT_DATE_RANGE_OPTIONS.endDate,
  });

  useEffect(() => {
    if (!metricTypesFromUrl) {
      setUrlMetricTypesFilter(metricsFilters.metricTypes.join(','));
    }
    if (!dataStreamsFromUrl && dataStreams) {
      setUrlDataStreamsFilter(dataStreams.map((ds) => ds.name).join(','));
    }
    if (!startDateFromUrl || !endDateFromUrl) {
      setUrlDateRangeFilter({ startDate: metricsFilters.from, endDate: metricsFilters.to });
    }
  }, [
    dataStreams,
    dataStreamsFromUrl,
    endDateFromUrl,
    metricTypesFromUrl,
    metricsFilters.dataStreams,
    metricsFilters.from,
    metricsFilters.metricTypes,
    metricsFilters.to,
    setUrlDataStreamsFilter,
    setUrlDateRangeFilter,
    setUrlMetricTypesFilter,
    startDateFromUrl,
  ]);

  useEffect(() => {
    setMetricsFilters((prevState) => ({
      ...prevState,
      metricTypes: metricTypesFromUrl?.length ? metricTypesFromUrl : prevState.metricTypes,
      dataStreams: dataStreamsFromUrl?.length ? dataStreamsFromUrl : prevState.dataStreams,
    }));
  }, [metricTypesFromUrl, dataStreamsFromUrl]);

  const { dateRangePickerState, onRefreshChange, onTimeChange } = useDateRangePicker();

  const {
    error,
    data,
    isFetching,
    isFetched,
    refetch: refetchDataUsageMetrics,
  } = useGetDataUsageMetrics(
    {
      ...metricsFilters,
      from: dateRangePickerState.startDate,
      to: dateRangePickerState.endDate,
    },
    {
      retry: false,
      enabled: !!metricsFilters.dataStreams.length,
    }
  );

  const onRefresh = useCallback(() => {
    refetchDataUsageMetrics();
  }, [refetchDataUsageMetrics]);

  const onChangeDataStreamsFilter = useCallback(
    (selectedDataStreams: string[]) => {
      setMetricsFilters((prevState) => ({ ...prevState, dataStreams: selectedDataStreams }));
    },
    [setMetricsFilters]
  );

  const onChangeMetricTypesFilter = useCallback(
    (selectedMetricTypes: string[]) => {
      setMetricsFilters((prevState) => ({ ...prevState, metricTypes: selectedMetricTypes }));
    },
    [setMetricsFilters]
  );

  const filterOptions: ChartFiltersProps['filterOptions'] = useMemo(() => {
    const dataStreamsOptions = dataStreams?.reduce<Record<string, number>>((acc, ds) => {
      acc[ds.name] = ds.storageSizeBytes;
      return acc;
    }, {});

    return {
      dataStreams: {
        filterName: 'dataStreams',
        options: dataStreamsOptions ? Object.keys(dataStreamsOptions) : metricsFilters.dataStreams,
        appendOptions: dataStreamsOptions,
        selectedOptions: metricsFilters.dataStreams,
        onChangeFilterOptions: onChangeDataStreamsFilter,
        isFilterLoading: isFetchingDataStreams,
      },
      metricTypes: {
        filterName: 'metricTypes',
        options: metricsFilters.metricTypes,
        onChangeFilterOptions: onChangeMetricTypesFilter,
      },
    };
  }, [
    dataStreams,
    isFetchingDataStreams,
    metricsFilters.dataStreams,
    metricsFilters.metricTypes,
    onChangeDataStreamsFilter,
    onChangeMetricTypesFilter,
  ]);

  return (
    <EuiFlexGroup alignItems="flexStart" direction="column">
      <FlexItemWithCss>
        <ChartFilters
          dateRangePickerState={dateRangePickerState}
          isDataLoading={isFetchingDataStreams}
          onClick={refetchDataUsageMetrics}
          onRefresh={onRefresh}
          onRefreshChange={onRefreshChange}
          onTimeChange={onTimeChange}
          filterOptions={filterOptions}
          showMetricsTypesFilter={false}
        />
      </FlexItemWithCss>
      {!isFetching && error?.message && (
        <FlexItemWithCss>
          <EuiCallOut
            size="s"
            title={UX_LABELS.noDataStreamsSelected}
            iconType="iInCircle"
            color="warning"
          />
        </FlexItemWithCss>
      )}
      <FlexItemWithCss>
        {isFetched && data?.metrics ? (
          <Charts data={data} />
        ) : isFetching ? (
          <EuiLoadingElastic />
        ) : null}
      </FlexItemWithCss>
    </EuiFlexGroup>
  );
};
