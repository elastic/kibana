/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiPanel, EuiSuperDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { euiStyled, useTrackPageview } from '../../../../../observability/public';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
import { CategoryJobNoticesSection } from '../../../components/logging/log_analysis_job_status';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { useInterval } from '../../../hooks/use_interval';
import { PageViewLogInContext } from '../stream/page_view_log_in_context';
import { TopCategoriesSection } from './sections/top_categories';
import { useLogEntryCategoriesResults } from './use_log_entry_categories_results';
import {
  StringTimeRange,
  useLogEntryCategoriesResultsUrlState,
} from './use_log_entry_categories_results_url_state';

const JOB_STATUS_POLLING_INTERVAL = 30000;

interface LogEntryCategoriesResultsContentProps {
  onOpenSetup: () => void;
}

export const LogEntryCategoriesResultsContent: React.FunctionComponent<LogEntryCategoriesResultsContentProps> = ({
  onOpenSetup,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_results' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_results', delay: 15000 });

  const {
    fetchJobStatus,
    fetchModuleDefinition,
    moduleDescriptor,
    setupStatus,
    hasOutdatedJobConfigurations,
    hasOutdatedJobDefinitions,
    hasStoppedJobs,
    jobIds,
    categoryQualityWarnings,
    sourceConfiguration: { sourceId },
  } = useLogEntryCategoriesModuleContext();

  const {
    timeRange: selectedTimeRange,
    setTimeRange: setSelectedTimeRange,
    autoRefresh,
    setAutoRefresh,
  } = useLogEntryCategoriesResultsUrlState();

  const [categoryQueryTimeRange, setCategoryQueryTimeRange] = useState<{
    lastChangedTime: number;
    timeRange: TimeRange;
  }>(() => ({
    lastChangedTime: Date.now(),
    timeRange: stringToNumericTimeRange(selectedTimeRange),
  }));

  const [categoryQueryDatasets, setCategoryQueryDatasets] = useState<string[]>([]);

  const { services } = useKibana<{}>();

  const showLoadDataErrorNotification = useCallback(
    (error: Error) => {
      // eslint-disable-next-line no-unused-expressions
      services.notifications?.toasts.addError(error, {
        title: loadDataErrorTitle,
      });
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [services.notifications]
  );

  const {
    getLogEntryCategoryDatasets,
    getTopLogEntryCategories,
    isLoadingLogEntryCategoryDatasets,
    isLoadingTopLogEntryCategories,
    logEntryCategoryDatasets,
    topLogEntryCategories,
  } = useLogEntryCategoriesResults({
    categoriesCount: 25,
    endTime: categoryQueryTimeRange.timeRange.endTime,
    filteredDatasets: categoryQueryDatasets,
    onGetTopLogEntryCategoriesError: showLoadDataErrorNotification,
    sourceId,
    startTime: categoryQueryTimeRange.timeRange.startTime,
  });

  const handleQueryTimeRangeChange = useCallback(
    ({ start: startTime, end: endTime }: { start: string; end: string }) => {
      setCategoryQueryTimeRange((previousQueryParameters) => ({
        ...previousQueryParameters,
        timeRange: stringToNumericTimeRange({ startTime, endTime }),
        lastChangedTime: Date.now(),
      }));
    },
    [setCategoryQueryTimeRange]
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

  const handleAutoRefreshChange = useCallback(
    ({ isPaused, refreshInterval: interval }: { isPaused: boolean; refreshInterval: number }) => {
      setAutoRefresh({
        isPaused,
        interval,
      });
    },
    [setAutoRefresh]
  );

  const hasResults = useMemo(() => topLogEntryCategories.length > 0, [
    topLogEntryCategories.length,
  ]);

  const isFirstUse = useMemo(
    () =>
      ((setupStatus.type === 'skipped' && !!setupStatus.newlyCreated) ||
        setupStatus.type === 'succeeded') &&
      !hasResults,
    [hasResults, setupStatus]
  );

  useEffect(() => {
    getTopLogEntryCategories();
  }, [getTopLogEntryCategories, categoryQueryDatasets, categoryQueryTimeRange.lastChangedTime]);

  useEffect(() => {
    getLogEntryCategoryDatasets();
  }, [getLogEntryCategoryDatasets, categoryQueryTimeRange.lastChangedTime]);

  useEffect(() => {
    fetchModuleDefinition();
  }, [fetchModuleDefinition]);

  useInterval(() => {
    fetchJobStatus();
  }, JOB_STATUS_POLLING_INTERVAL);

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
    <ViewLogInContext.Provider
      sourceId={sourceId}
      startTimestamp={categoryQueryTimeRange.timeRange.startTime}
      endTimestamp={categoryQueryTimeRange.timeRange.endTime}
    >
      <ResultsContentPage>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="m">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem />
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
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CategoryJobNoticesSection
              hasOutdatedJobConfigurations={hasOutdatedJobConfigurations}
              hasOutdatedJobDefinitions={hasOutdatedJobDefinitions}
              hasStoppedJobs={hasStoppedJobs}
              isFirstUse={isFirstUse}
              moduleName={moduleDescriptor.moduleName}
              onRecreateMlJobForReconfiguration={onOpenSetup}
              onRecreateMlJobForUpdate={onOpenSetup}
              qualityWarnings={categoryQualityWarnings}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="m">
              <TopCategoriesSection
                availableDatasets={logEntryCategoryDatasets}
                isLoadingDatasets={isLoadingLogEntryCategoryDatasets}
                isLoadingTopCategories={isLoadingTopLogEntryCategories}
                jobId={jobIds['log-entry-categories-count']}
                onChangeDatasetSelection={setCategoryQueryDatasets}
                onRequestRecreateMlJob={onOpenSetup}
                selectedDatasets={categoryQueryDatasets}
                sourceId={sourceId}
                timeRange={categoryQueryTimeRange.timeRange}
                topCategories={topLogEntryCategories}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ResultsContentPage>
      <PageViewLogInContext />
    </ViewLogInContext.Provider>
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

// This is needed due to the flex-basis: 100% !important; rule that
// kicks in on small screens via media queries breaking when using direction="column"
export const ResultsContentPage = euiStyled(EuiPage)`
  flex: 1 0 0%;
  flex-direction: column;

  .euiFlexGroup--responsive > .euiFlexItem {
    flex-basis: auto !important;
  }
`;

const loadDataErrorTitle = i18n.translate(
  'xpack.infra.logs.logEntryCategories.loadDataErrorTitle',
  {
    defaultMessage: 'Failed to load category data',
  }
);
