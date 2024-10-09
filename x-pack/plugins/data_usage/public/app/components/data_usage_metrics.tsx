/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic } from '@elastic/eui';
import { Charts } from './charts';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { PLUGIN_NAME } from '../../../common';
import { useGetDataUsageMetrics } from '../../hooks/use_get_usage_metrics';
import { useDataUsageMetricsUrlParams } from '../hooks/use_charts_url_params';
import { MetricsResponse } from '../types';
import { DEFAULT_DATE_RANGE_OPTIONS, useDateRangePicker } from '../hooks/use_date_picker';
import { UsageMetricsRequestSchemaQueryParams } from '../../../common/rest_types';
import { ChartFilters } from './filters/charts_filters';

const EuiItemCss = css`
  width: 100%;
`;

export const DataUsageMetrics = () => {
  const {
    services: { chrome, appParams },
  } = useKibanaContextForPlugin();

  const {
    metricTypes: metricTypesFromUrl,
    dataStreams: dataStreamsFromUrl,
    startDate: startDateFromUrl,
    endDate: endDateFromUrl,
    setUrlMetricTypesFilter,
    setUrlDateRangeFilter,
  } = useDataUsageMetricsUrlParams();

  const [queryParams, setQueryParams] = useState<UsageMetricsRequestSchemaQueryParams>({
    metricTypes: ['storage_retained', 'ingest_rate'],
    dataStreams: [],
    from: DEFAULT_DATE_RANGE_OPTIONS.startDate,
    to: DEFAULT_DATE_RANGE_OPTIONS.endDate,
  });

  useEffect(() => {
    if (!metricTypesFromUrl) {
      setUrlMetricTypesFilter(
        typeof queryParams.metricTypes !== 'string'
          ? queryParams.metricTypes.join(',')
          : queryParams.metricTypes
      );
    }
    if (!startDateFromUrl || !endDateFromUrl) {
      setUrlDateRangeFilter({ startDate: queryParams.from, endDate: queryParams.to });
    }
  }, [
    endDateFromUrl,
    metricTypesFromUrl,
    queryParams.from,
    queryParams.metricTypes,
    queryParams.to,
    setUrlDateRangeFilter,
    setUrlMetricTypesFilter,
    startDateFromUrl,
  ]);

  useEffect(() => {
    setQueryParams((prevState) => ({
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
      ...queryParams,
      from: dateRangePickerState.startDate,
      to: dateRangePickerState.endDate,
    },
    {
      retry: false,
    }
  );

  const onRefresh = useCallback(() => {
    refetchDataUsageMetrics();
  }, [refetchDataUsageMetrics]);

  const onChangeDataStreamsFilter = useCallback(
    (selectedDataStreams: string[]) => {
      setQueryParams((prevState) => ({ ...prevState, dataStreams: selectedDataStreams }));
    },
    [setQueryParams]
  );

  const onChangeMetricTypesFilter = useCallback(
    (selectedMetricTypes: string[]) => {
      setQueryParams((prevState) => ({ ...prevState, metricTypes: selectedMetricTypes }));
    },
    [setQueryParams]
  );

  useBreadcrumbs([{ text: PLUGIN_NAME }], appParams, chrome);

  // TODO: show a toast?
  if (!isFetching && error?.body) {
    return <div>{error.body.message}</div>;
  }

  return (
    <EuiFlexGroup alignItems="flexStart" direction="column">
      <EuiFlexItem css={EuiItemCss}>
        <ChartFilters
          dateRangePickerState={dateRangePickerState}
          isDataLoading={isFetching}
          onClick={refetchDataUsageMetrics}
          onRefresh={onRefresh}
          onRefreshChange={onRefreshChange}
          onTimeChange={onTimeChange}
          onChangeDataStreamsFilter={onChangeDataStreamsFilter}
          onChangeMetricTypesFilter={onChangeMetricTypesFilter}
          showMetricsTypesFilter={false}
        />
      </EuiFlexItem>
      <EuiFlexItem css={EuiItemCss}>
        {isFetched && data ? <Charts data={data as MetricsResponse} /> : <EuiLoadingElastic />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
