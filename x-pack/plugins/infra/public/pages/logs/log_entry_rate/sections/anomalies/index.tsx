/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiStyled } from '../../../../../../../observability/public';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { getAnnotationsForAll, getLogEntryRateCombinedSeries } from '../helpers/data_formatters';
import { AnomaliesChart } from './chart';
import { AnomaliesTable } from './table';
import { ManageJobsButton } from '../../../../../components/logging/log_analysis_setup/manage_jobs_button';
import {
  ChangePaginationOptions,
  ChangeSortOptions,
  FetchNextPage,
  FetchPreviousPage,
  LogEntryAnomalies,
  Page,
  PaginationOptions,
  SortOptions,
} from '../../use_log_entry_anomalies_results';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

export const AnomaliesResults: React.FunctionComponent<{
  isLoadingLogRateResults: boolean;
  isLoadingAnomaliesResults: boolean;
  logEntryRateResults: LogEntryRateResults | null;
  anomalies: LogEntryAnomalies;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  onViewModuleList: () => void;
  page: Page;
  fetchNextPage?: FetchNextPage;
  fetchPreviousPage?: FetchPreviousPage;
  changeSortOptions: ChangeSortOptions;
  changePaginationOptions: ChangePaginationOptions;
  sortOptions: SortOptions;
  paginationOptions: PaginationOptions;
}> = ({
  isLoadingLogRateResults,
  isLoadingAnomaliesResults,
  logEntryRateResults,
  setTimeRange,
  timeRange,
  onViewModuleList,
  anomalies,
  changeSortOptions,
  sortOptions,
  changePaginationOptions,
  paginationOptions,
  fetchNextPage,
  fetchPreviousPage,
  page,
}) => {
  const logEntryRateSeries = useMemo(
    () =>
      logEntryRateResults && logEntryRateResults.histogramBuckets
        ? getLogEntryRateCombinedSeries(logEntryRateResults)
        : [],
    [logEntryRateResults]
  );
  const anomalyAnnotations = useMemo(
    () =>
      logEntryRateResults && logEntryRateResults.histogramBuckets
        ? getAnnotationsForAll(logEntryRateResults)
        : {
            warning: [],
            minor: [],
            major: [],
            critical: [],
          },
    [logEntryRateResults]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="m" aria-label={title}>
            <h1>{title}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ManageJobsButton onClick={onViewModuleList} size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {(!logEntryRateResults ||
        (logEntryRateResults &&
          logEntryRateResults.histogramBuckets &&
          !logEntryRateResults.histogramBuckets.length)) &&
      (!anomalies || anomalies.length === 0) ? (
        <LoadingOverlayWrapper
          isLoading={isLoadingLogRateResults || isLoadingAnomaliesResults}
          loadingChildren={<LoadingOverlayContent />}
        >
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataTitle', {
                  defaultMessage: 'There is no data to display.',
                })}
              </h2>
            }
            titleSize="m"
            body={
              <p>
                {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataBody', {
                  defaultMessage: 'You may want to adjust your time range.',
                })}
              </p>
            }
          />
        </LoadingOverlayWrapper>
      ) : (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <AnomaliesChart
                chartId="overall"
                isLoading={isLoadingLogRateResults}
                setTimeRange={setTimeRange}
                timeRange={timeRange}
                series={logEntryRateSeries}
                annotations={anomalyAnnotations}
                renderAnnotationTooltip={renderAnnotationTooltip}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <AnomaliesTable
            results={anomalies}
            setTimeRange={setTimeRange}
            timeRange={timeRange}
            changeSortOptions={changeSortOptions}
            changePaginationOptions={changePaginationOptions}
            sortOptions={sortOptions}
            paginationOptions={paginationOptions}
            fetchNextPage={fetchNextPage}
            fetchPreviousPage={fetchPreviousPage}
            page={page}
            isLoading={isLoadingAnomaliesResults}
          />
        </>
      )}
    </>
  );
};

const title = i18n.translate('xpack.infra.logs.analysis.anomaliesSectionTitle', {
  defaultMessage: 'Anomalies',
});

interface ParsedAnnotationDetails {
  anomalyScoresByPartition: Array<{ partitionName: string; maximumAnomalyScore: number }>;
}

const overallAnomalyScoreLabel = i18n.translate(
  'xpack.infra.logs.analysis.overallAnomalyChartMaxScoresLabel',
  {
    defaultMessage: 'Max anomaly scores:',
  }
);

const AnnotationTooltip: React.FunctionComponent<{ details: string }> = ({ details }) => {
  const parsedDetails: ParsedAnnotationDetails = JSON.parse(details);
  return (
    <TooltipWrapper>
      <span>
        <b>{overallAnomalyScoreLabel}</b>
      </span>
      <ul>
        {parsedDetails.anomalyScoresByPartition.map(({ partitionName, maximumAnomalyScore }) => {
          return (
            <li key={`overall-anomaly-chart-${partitionName}`}>
              <span>
                {`${partitionName}: `}
                <b>{maximumAnomalyScore}</b>
              </span>
            </li>
          );
        })}
      </ul>
    </TooltipWrapper>
  );
};

const renderAnnotationTooltip = (details?: string) => {
  // Note: Seems to be necessary to get things typed correctly all the way through to elastic-charts components
  if (!details) {
    return <div />;
  }
  return <AnnotationTooltip details={details} />;
};

const TooltipWrapper = euiStyled('div')`
  white-space: nowrap;
`;

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading anomalies' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
