/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiPanel, EuiSuperDatePicker } from '@elastic/eui';
import moment from 'moment';
import { encode, RisonValue } from 'rison-node';
import { stringify } from 'query-string';
import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { euiStyled, useTrackPageview } from '../../../../../observability/public';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
import { bucketSpan } from '../../../../common/log_analysis';
import {
  CategoryJobNoticesSection,
  LogAnalysisJobProblemIndicator,
} from '../../../components/logging/log_analysis_job_status';
import { DatasetsSelector } from '../../../components/logging/log_analysis_results/datasets_selector';
import { useLogAnalysisSetupFlyoutStateContext } from '../../../components/logging/log_analysis_setup/setup_flyout';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis/log_analysis_capabilities';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { useLogEntryRateModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_rate';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { useInterval } from '../../../hooks/use_interval';
import { AnomaliesResults } from './sections/anomalies';
import { useLogEntryAnomaliesResults } from './use_log_entry_anomalies_results';
import { useLogEntryRateResults } from './use_log_entry_rate_results';
import {
  StringTimeRange,
  useLogAnalysisResultsUrlState,
} from './use_log_entry_rate_results_url_state';
import { LogEntryFlyout, LogEntryFlyoutProps } from '../../../components/logging/log_entry_flyout';
import { LogFlyout } from '../../../containers/logs/log_flyout';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export const SORT_DEFAULTS = {
  direction: 'desc' as const,
  field: 'anomalyScore' as const,
};

export const PAGINATION_DEFAULTS = {
  pageSize: 25,
};

export const LogEntryRateResultsContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_results' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_results', delay: 15000 });
  const navigateToApp = useKibana().services.application?.navigateToApp;

  const { sourceId } = useLogSourceContext();

  const { hasLogAnalysisSetupCapabilities } = useLogAnalysisCapabilitiesContext();

  const {
    hasOutdatedJobConfigurations: hasOutdatedLogEntryRateJobConfigurations,
    hasOutdatedJobDefinitions: hasOutdatedLogEntryRateJobDefinitions,
    hasStoppedJobs: hasStoppedLogEntryRateJobs,
    moduleDescriptor: logEntryRateModuleDescriptor,
    setupStatus: logEntryRateSetupStatus,
  } = useLogEntryRateModuleContext();

  const {
    categoryQualityWarnings,
    hasOutdatedJobConfigurations: hasOutdatedLogEntryCategoriesJobConfigurations,
    hasOutdatedJobDefinitions: hasOutdatedLogEntryCategoriesJobDefinitions,
    hasStoppedJobs: hasStoppedLogEntryCategoriesJobs,
    moduleDescriptor: logEntryCategoriesModuleDescriptor,
    setupStatus: logEntryCategoriesSetupStatus,
  } = useLogEntryCategoriesModuleContext();

  const {
    timeRange: selectedTimeRange,
    setTimeRange: setSelectedTimeRange,
    autoRefresh,
    setAutoRefresh,
  } = useLogAnalysisResultsUrlState();

  const [queryTimeRange, setQueryTimeRange] = useState<{
    value: TimeRange;
    lastChangedTime: number;
  }>(() => ({
    value: stringToNumericTimeRange(selectedTimeRange),
    lastChangedTime: Date.now(),
  }));

  const linkToLogStream = useCallback<LogEntryFlyoutProps['setFilter']>(
    (filter, id, timeKey) => {
      const params = {
        logPosition: encode({
          end: moment(queryTimeRange.value.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          position: timeKey as RisonValue,
          start: moment(queryTimeRange.value.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          streamLive: false,
        }),
        flyoutOptions: encode({
          surroundingLogsId: id,
        }),
        logFilter: encode({
          expression: filter,
          kind: 'kuery',
        }),
      };

      // eslint-disable-next-line no-unused-expressions
      navigateToApp?.('logs', { path: `/stream?${stringify(params)}` });
    },
    [queryTimeRange, navigateToApp]
  );

  const bucketDuration = useMemo(
    () => getBucketDuration(queryTimeRange.value.startTime, queryTimeRange.value.endTime),
    [queryTimeRange.value.endTime, queryTimeRange.value.startTime]
  );

  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);

  const { getLogEntryRate, isLoading, logEntryRate } = useLogEntryRateResults({
    sourceId,
    startTime: queryTimeRange.value.startTime,
    endTime: queryTimeRange.value.endTime,
    bucketDuration,
    filteredDatasets: selectedDatasets,
  });

  const {
    isLoadingLogEntryAnomalies,
    logEntryAnomalies,
    page,
    fetchNextPage,
    fetchPreviousPage,
    changeSortOptions,
    changePaginationOptions,
    sortOptions,
    paginationOptions,
    datasets,
    isLoadingDatasets,
  } = useLogEntryAnomaliesResults({
    sourceId,
    startTime: queryTimeRange.value.startTime,
    endTime: queryTimeRange.value.endTime,
    defaultSortOptions: SORT_DEFAULTS,
    defaultPaginationOptions: PAGINATION_DEFAULTS,
    filteredDatasets: selectedDatasets,
  });

  const { flyoutVisible, setFlyoutVisibility, flyoutItem, isLoading: isFlyoutLoading } = useContext(
    LogFlyout.Context
  );

  const handleQueryTimeRangeChange = useCallback(
    ({ start: startTime, end: endTime }: { start: string; end: string }) => {
      setQueryTimeRange({
        value: stringToNumericTimeRange({ startTime, endTime }),
        lastChangedTime: Date.now(),
      });
    },
    [setQueryTimeRange]
  );

  const handleSelectedTimeRangeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }
      setSelectedTimeRange({
        startTime: selectedTime.start,
        endTime: selectedTime.end,
      });
      handleQueryTimeRangeChange(selectedTime);
    },
    [setSelectedTimeRange, handleQueryTimeRangeChange]
  );

  const handleChartTimeRangeChange = useCallback(
    ({ startTime, endTime }: TimeRange) => {
      handleSelectedTimeRangeChange({
        end: new Date(endTime).toISOString(),
        isInvalid: false,
        start: new Date(startTime).toISOString(),
      });
    },
    [handleSelectedTimeRangeChange]
  );

  const handleAutoRefreshChange = useCallback(
    ({ isPaused, refreshInterval: interval }: { isPaused: boolean; refreshInterval: number }) => {
      setAutoRefresh({
        isPaused,
        interval,
      });
    },
    [setAutoRefresh]
  );

  const { showModuleList, showModuleSetup } = useLogAnalysisSetupFlyoutStateContext();

  const showLogEntryRateSetup = useCallback(() => showModuleSetup('logs_ui_analysis'), [
    showModuleSetup,
  ]);
  const showLogEntryCategoriesSetup = useCallback(() => showModuleSetup('logs_ui_categories'), [
    showModuleSetup,
  ]);

  const hasLogRateResults = (logEntryRate?.histogramBuckets?.length ?? 0) > 0;
  const hasAnomalyResults = logEntryAnomalies.length > 0;

  const isFirstUse = useMemo(
    () =>
      ((logEntryCategoriesSetupStatus.type === 'skipped' &&
        !!logEntryCategoriesSetupStatus.newlyCreated) ||
        logEntryCategoriesSetupStatus.type === 'succeeded' ||
        (logEntryRateSetupStatus.type === 'skipped' && !!logEntryRateSetupStatus.newlyCreated) ||
        logEntryRateSetupStatus.type === 'succeeded') &&
      !(hasLogRateResults || hasAnomalyResults),
    [hasAnomalyResults, hasLogRateResults, logEntryCategoriesSetupStatus, logEntryRateSetupStatus]
  );

  useEffect(() => {
    getLogEntryRate();
  }, [getLogEntryRate, selectedDatasets, queryTimeRange.lastChangedTime]);

  useInterval(
    () => {
      handleQueryTimeRangeChange({
        start: selectedTimeRange.startTime,
        end: selectedTimeRange.endTime,
      });
    },
    autoRefresh.isPaused ? null : autoRefresh.interval
  );

  return (
    <>
      <ResultsContentPage>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <DatasetsSelector
                  availableDatasets={datasets}
                  isLoading={isLoadingDatasets}
                  selectedDatasets={selectedDatasets}
                  onChangeDatasetSelection={setSelectedDatasets}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSuperDatePicker
                  start={selectedTimeRange.startTime}
                  end={selectedTimeRange.endTime}
                  onTimeChange={handleSelectedTimeRangeChange}
                  isPaused={autoRefresh.isPaused}
                  refreshInterval={autoRefresh.interval}
                  onRefreshChange={handleAutoRefreshChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LogAnalysisJobProblemIndicator
              hasOutdatedJobConfigurations={hasOutdatedLogEntryRateJobConfigurations}
              hasOutdatedJobDefinitions={hasOutdatedLogEntryRateJobDefinitions}
              hasSetupCapabilities={hasLogAnalysisSetupCapabilities}
              hasStoppedJobs={hasStoppedLogEntryRateJobs}
              isFirstUse={false /* the first use message is already shown by the section below */}
              moduleName={logEntryRateModuleDescriptor.moduleName}
              onRecreateMlJobForReconfiguration={showLogEntryRateSetup}
              onRecreateMlJobForUpdate={showLogEntryRateSetup}
            />
            <CategoryJobNoticesSection
              hasOutdatedJobConfigurations={hasOutdatedLogEntryCategoriesJobConfigurations}
              hasOutdatedJobDefinitions={hasOutdatedLogEntryCategoriesJobDefinitions}
              hasSetupCapabilities={hasLogAnalysisSetupCapabilities}
              hasStoppedJobs={hasStoppedLogEntryCategoriesJobs}
              isFirstUse={isFirstUse}
              moduleName={logEntryCategoriesModuleDescriptor.moduleName}
              onRecreateMlJobForReconfiguration={showLogEntryCategoriesSetup}
              onRecreateMlJobForUpdate={showLogEntryCategoriesSetup}
              qualityWarnings={categoryQualityWarnings}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="m">
              <AnomaliesResults
                isLoadingLogRateResults={isLoading}
                isLoadingAnomaliesResults={isLoadingLogEntryAnomalies}
                onViewModuleList={showModuleList}
                logEntryRateResults={logEntryRate}
                anomalies={logEntryAnomalies}
                setTimeRange={handleChartTimeRangeChange}
                timeRange={queryTimeRange.value}
                page={page}
                fetchNextPage={fetchNextPage}
                fetchPreviousPage={fetchPreviousPage}
                changeSortOptions={changeSortOptions}
                changePaginationOptions={changePaginationOptions}
                sortOptions={sortOptions}
                paginationOptions={paginationOptions}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ResultsContentPage>

      {flyoutVisible ? (
        <LogEntryFlyout
          flyoutItem={flyoutItem}
          setFlyoutVisibility={setFlyoutVisibility}
          loading={isFlyoutLoading}
          setFilter={linkToLogStream}
        />
      ) : null}
    </>
  );
};

const stringToNumericTimeRange = (timeRange: StringTimeRange): TimeRange => ({
  startTime: moment(
    datemath.parse(timeRange.startTime, {
      momentInstance: moment,
    })
  ).valueOf(),
  endTime: moment(
    datemath.parse(timeRange.endTime, {
      momentInstance: moment,
      roundUp: true,
    })
  ).valueOf(),
});

/**
 * This function takes the current time range in ms,
 * works out the bucket interval we'd need to always
 * display 100 data points, and then takes that new
 * value and works out the nearest multiple of
 * 900000 (15 minutes) to it, so that we don't end up with
 * jaggy bucket boundaries between the ML buckets and our
 * aggregation buckets.
 */
const getBucketDuration = (startTime: number, endTime: number) => {
  const msRange = moment(endTime).diff(moment(startTime));
  const bucketIntervalInMs = msRange / 100;
  const result = bucketSpan * Math.round(bucketIntervalInMs / bucketSpan);
  const roundedResult = parseInt(Number(result).toFixed(0), 10);
  return roundedResult < bucketSpan ? bucketSpan : roundedResult;
};

// This is needed due to the flex-basis: 100% !important; rule that
// kicks in on small screens via media queries breaking when using direction="column"
export const ResultsContentPage = euiStyled(EuiPage)`
  flex: 1 0 0%;

  .euiFlexGroup--responsive > .euiFlexItem {
    flex-basis: auto !important;
  }
`;
