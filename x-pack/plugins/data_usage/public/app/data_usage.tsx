/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiPageSection,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { UsageMetricsRequestSchemaQueryParams } from '../../common/rest_types';
import { Charts } from './components/charts';
import { UsageMetricsDateRangePicker } from './components/date_picker';
import { useBreadcrumbs } from '../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { PLUGIN_NAME } from '../../common';
import { useGetDataUsageMetrics } from '../hooks/use_get_usage_metrics';
import { DEFAULT_DATE_RANGE_OPTIONS, useDateRangePicker } from './hooks/use_date_picker';
import { useDataUsageMetricsUrlParams } from './hooks/use_charts_url_params';

export const DataUsage = () => {
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

  const [metricsFilters, setMetricsFilters] = useState<UsageMetricsRequestSchemaQueryParams>({
    metricTypes: ['storage_retained', 'ingest_rate'],
    // TODO: Replace with data streams from /data_streams api
    dataStreams: [
      '.alerts-ml.anomaly-detection-health.alerts-default',
      '.alerts-stack.alerts-default',
    ],
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

  useBreadcrumbs([{ text: PLUGIN_NAME }], appParams, chrome);

  // TODO: show a toast?
  if (!isFetching && error?.body) {
    return <div>{error.body.message}</div>;
  }

  return (
    <>
      <EuiTitle size="l">
        <h2>
          {i18n.translate('xpack.dataUsage.pageTitle', {
            defaultMessage: 'Data Usage',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.dataUsage.description"
                defaultMessage="Monitor data ingested and retained by data streams."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <UsageMetricsDateRangePicker
              dateRangePickerState={dateRangePickerState}
              isDataLoading={isFetching}
              onRefresh={onRefresh}
              onRefreshChange={onRefreshChange}
              onTimeChange={onTimeChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        {isFetched && data ? <Charts data={data} /> : <EuiLoadingElastic />}
      </EuiPageSection>
    </>
  );
};
