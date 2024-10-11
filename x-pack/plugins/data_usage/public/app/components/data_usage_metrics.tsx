/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, memo, useState } from 'react';
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
import { ChartFilters } from './filters/charts_filters';
import { UX_LABELS } from '../translations';

const EuiItemCss = css`
  width: 100%;
`;

const FlexItemWithCss = memo(({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem css={EuiItemCss}>{children}</EuiFlexItem>
));

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
    if (!startDateFromUrl || !endDateFromUrl) {
      setUrlDateRangeFilter({ startDate: metricsFilters.from, endDate: metricsFilters.to });
    }
  }, [
    endDateFromUrl,
    metricTypesFromUrl,
    metricsFilters.from,
    metricsFilters.metricTypes,
    metricsFilters.to,
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

  useBreadcrumbs([{ text: PLUGIN_NAME }], appParams, chrome);

  return (
    <EuiFlexGroup alignItems="flexStart" direction="column">
      <FlexItemWithCss>
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
