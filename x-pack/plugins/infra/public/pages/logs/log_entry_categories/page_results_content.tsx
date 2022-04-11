/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiSuperDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { MLJobsAwaitingNodeWarning, ML_PAGES, useMlHref } from '../../../../../ml/public';
import { useTrackPageview } from '../../../../../observability/public';
import { TimeRange } from '../../../../common/time/time_range';
import { CategoryJobNoticesSection } from '../../../components/logging/log_analysis_job_status';
import { AnalyzeInMlButton } from '../../../components/logging/log_analysis_results';
import { DatasetsSelector } from '../../../components/logging/log_analysis_results/datasets_selector';
import { RecreateJobButton } from '../../../components/logging/log_analysis_setup/create_job_button';
import { useLogAnalysisCapabilitiesContext } from '../../../containers/logs/log_analysis/log_analysis_capabilities';
import { useLogEntryCategoriesModuleContext } from '../../../containers/logs/log_analysis/modules/log_entry_categories';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { LogsPageTemplate } from '../page_template';
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
  pageTitle: string;
}

export const LogEntryCategoriesResultsContent: React.FunctionComponent<
  LogEntryCategoriesResultsContentProps
> = ({ onOpenSetup, pageTitle }) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_results' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_results', delay: 15000 });

  const {
    services: { ml, http },
  } = useKibanaContextForPlugin();

  const { logViewStatus } = useLogViewContext();
  const { hasLogAnalysisSetupCapabilities } = useLogAnalysisCapabilitiesContext();

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
      services.notifications?.toasts.addError(error, {
        title: loadDataErrorTitle,
      });
    },
    [services.notifications]
  );

  const {
    getLogEntryCategoryDatasets,
    getTopLogEntryCategories,
    isLoadingLogEntryCategoryDatasets,
    isLoadingTopLogEntryCategories,
    logEntryCategoryDatasets,
    topLogEntryCategories,
    sortOptions,
    changeSortOptions,
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

  const hasResults = useMemo(
    () => topLogEntryCategories.length > 0,
    [topLogEntryCategories.length]
  );

  const isFirstUse = useMemo(
    () =>
      ((setupStatus.type === 'skipped' && !!setupStatus.newlyCreated) ||
        setupStatus.type === 'succeeded') &&
      !hasResults,
    [hasResults, setupStatus]
  );

  useEffect(() => {
    getTopLogEntryCategories();
  }, [
    getTopLogEntryCategories,
    categoryQueryDatasets,
    categoryQueryTimeRange.lastChangedTime,
    sortOptions,
  ]);

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

  const analyzeInMlLink = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_EXPLORER,
    pageState: {
      jobIds: [jobIds['log-entry-categories-count']],
      timeRange: {
        from: moment(categoryQueryTimeRange.timeRange.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        to: moment(categoryQueryTimeRange.timeRange.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        mode: 'absolute',
      },
    },
  });

  return (
    <ViewLogInContext.Provider
      sourceId={sourceId}
      startTimestamp={categoryQueryTimeRange.timeRange.startTime}
      endTimestamp={categoryQueryTimeRange.timeRange.endTime}
    >
      <LogsPageTemplate
        hasData={logViewStatus?.index !== 'missing'}
        pageHeader={{
          pageTitle,
          rightSideItems: [
            <RecreateJobButton
              hasSetupCapabilities={hasLogAnalysisSetupCapabilities}
              onClick={onOpenSetup}
              size="s"
            />,
            <AnalyzeInMlButton href={analyzeInMlLink} />,
          ],
        }}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <DatasetsSelector
                  availableDatasets={logEntryCategoryDatasets}
                  isLoading={isLoadingLogEntryCategoryDatasets}
                  onChangeDatasetSelection={setCategoryQueryDatasets}
                  selectedDatasets={categoryQueryDatasets}
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
            <MLJobsAwaitingNodeWarning jobIds={Object.values(jobIds)} />
            <CategoryJobNoticesSection
              hasOutdatedJobConfigurations={hasOutdatedJobConfigurations}
              hasOutdatedJobDefinitions={hasOutdatedJobDefinitions}
              hasSetupCapabilities={hasLogAnalysisSetupCapabilities}
              hasStoppedJobs={hasStoppedJobs}
              isFirstUse={isFirstUse}
              moduleName={moduleDescriptor.moduleName}
              onRecreateMlJobForReconfiguration={onOpenSetup}
              onRecreateMlJobForUpdate={onOpenSetup}
              qualityWarnings={categoryQualityWarnings}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TopCategoriesSection
              isLoadingTopCategories={isLoadingTopLogEntryCategories}
              jobId={jobIds['log-entry-categories-count']}
              sourceId={sourceId}
              timeRange={categoryQueryTimeRange.timeRange}
              topCategories={topLogEntryCategories}
              sortOptions={sortOptions}
              changeSortOptions={changeSortOptions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </LogsPageTemplate>
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
