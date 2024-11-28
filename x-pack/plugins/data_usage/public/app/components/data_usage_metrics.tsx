/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Charts } from './charts';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { DEFAULT_METRIC_TYPES, type UsageMetricsRequestBody } from '../../../common/rest_types';
import { PLUGIN_NAME } from '../../translations';
import { useGetDataUsageMetrics } from '../../hooks/use_get_usage_metrics';
import { useGetDataUsageDataStreams } from '../../hooks/use_get_data_streams';
import { useDataUsageMetricsUrlParams } from '../hooks/use_charts_url_params';
import { DEFAULT_DATE_RANGE_OPTIONS, isDateRangeValid } from '../../../common/utils';
import { useDateRangePicker } from '../hooks/use_date_picker';
import { ChartFilters, ChartFiltersProps } from './filters/charts_filters';
import { ChartsLoading } from './charts_loading';
import { NoDataCallout } from './no_data_callout';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

const EuiItemCss = css`
  width: 100%;
`;

const FlexItemWithCss = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem css={EuiItemCss}>{children}</EuiFlexItem>
);

export const DataUsageMetrics = memo(
  ({ 'data-test-subj': dataTestSubj = 'data-usage-metrics' }: { 'data-test-subj'?: string }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const [isFirstPageLoad, setIsFirstPageLoad] = useState(true);

    const {
      services: { chrome, appParams, notifications },
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

    const {
      error: errorFetchingDataStreams,
      data: dataStreams,
      isFetching: isFetchingDataStreams,
    } = useGetDataUsageDataStreams({
      selectedDataStreams: dataStreamsFromUrl,
      options: {
        enabled: true,
        retry: false,
      },
    });

    const [metricsFilters, setMetricsFilters] = useState<UsageMetricsRequestBody>({
      metricTypes: [...DEFAULT_METRIC_TYPES],
      dataStreams: [],
      from: DEFAULT_DATE_RANGE_OPTIONS.startDate,
      to: DEFAULT_DATE_RANGE_OPTIONS.endDate,
    });

    useEffect(() => {
      if (!metricTypesFromUrl && isFirstPageLoad) {
        setUrlMetricTypesFilter(metricsFilters.metricTypes.join(','));
      }
      if (!dataStreamsFromUrl && dataStreams && isFirstPageLoad) {
        const hasMoreThan50 = dataStreams.length > 50;
        const _dataStreams = hasMoreThan50 ? dataStreams.slice(0, 50) : dataStreams;
        setUrlDataStreamsFilter(_dataStreams.map((ds) => ds.name).join(','));
      }
      if (!startDateFromUrl || !endDateFromUrl) {
        setUrlDateRangeFilter({ startDate: metricsFilters.from, endDate: metricsFilters.to });
      }
    }, [
      dataStreams,
      dataStreamsFromUrl,
      endDateFromUrl,
      isFirstPageLoad,
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
        from: startDateFromUrl ?? prevState.from,
        to: endDateFromUrl ?? prevState.to,
      }));
    }, [metricTypesFromUrl, dataStreamsFromUrl, startDateFromUrl, endDateFromUrl]);

    const { dateRangePickerState, onRefreshChange, onTimeChange } = useDateRangePicker();

    const isValidDateRange = useMemo(
      () =>
        isDateRangeValid({
          start: dateRangePickerState.startDate,
          end: dateRangePickerState.endDate,
        }),
      [dateRangePickerState.endDate, dateRangePickerState.startDate]
    );

    const enableFetchUsageMetricsData = useMemo(
      () =>
        isValidDateRange &&
        metricsFilters.dataStreams.length > 0 &&
        metricsFilters.metricTypes.length > 0,
      [isValidDateRange, metricsFilters.dataStreams, metricsFilters.metricTypes]
    );

    const {
      error: errorFetchingDataUsageMetrics,
      data: usageMetricsData,
      isFetching,
      isFetched: hasFetchedDataUsageMetricsData,
      refetch: refetchDataUsageMetrics,
    } = useGetDataUsageMetrics(
      {
        ...metricsFilters,
        from: dateRangePickerState.startDate,
        to: dateRangePickerState.endDate,
      },
      {
        retry: false,
        enabled: enableFetchUsageMetricsData,
      }
    );

    useEffect(() => {
      if (!isFetching && hasFetchedDataUsageMetricsData) {
        setIsFirstPageLoad(false);
      }
    }, [isFetching, hasFetchedDataUsageMetricsData]);

    const onRefresh = useCallback(() => {
      if (!enableFetchUsageMetricsData) {
        return;
      }
      refetchDataUsageMetrics();
    }, [enableFetchUsageMetricsData, refetchDataUsageMetrics]);

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
          options: dataStreamsOptions
            ? Object.keys(dataStreamsOptions)
            : metricsFilters.dataStreams,
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

    if (errorFetchingDataUsageMetrics) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.dataUsage.getMetrics.addFailure.toast.title', {
          defaultMessage: 'Error getting usage metrics',
        }),
        text: errorFetchingDataUsageMetrics.message,
      });
    }
    if (errorFetchingDataStreams) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.dataUsage.getDataStreams.addFailure.toast.title', {
          defaultMessage: 'Error getting data streams',
        }),
        text: errorFetchingDataStreams.message,
      });
    }

    return (
      <EuiFlexGroup alignItems="flexStart" direction="column" data-test-subj={getTestId()}>
        <FlexItemWithCss>
          <ChartFilters
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isFetchingDataStreams}
            isUpdateDisabled={!enableFetchUsageMetricsData}
            onClick={refetchDataUsageMetrics}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
            filterOptions={filterOptions}
            showMetricsTypesFilter={false}
            data-test-subj={getTestId('filter')}
          />
        </FlexItemWithCss>
        <FlexItemWithCss>
          {hasFetchedDataUsageMetricsData && usageMetricsData ? (
            <Charts data={usageMetricsData} data-test-subj={dataTestSubj} />
          ) : isFetching ? (
            <ChartsLoading data-test-subj={dataTestSubj} />
          ) : (
            <NoDataCallout data-test-subj={dataTestSubj} />
          )}
        </FlexItemWithCss>
      </EuiFlexGroup>
    );
  }
);
