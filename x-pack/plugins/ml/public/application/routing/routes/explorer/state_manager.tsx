/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useUrlState } from '@kbn/ml-url-state';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ML_JOB_ID } from '@kbn/ml-anomaly-utils';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { useMlKibana } from '../../../contexts/kibana';

import type { MlJobWithTimeRange } from '../../../../../common/types/anomaly_detection_jobs';
import { useRefresh } from '../../use_refresh';
import { Explorer } from '../../../explorer';
import { useExplorerData } from '../../../explorer/actions';
import { useJobSelection } from '../../../components/job_selector/use_job_selection';
import { useTableInterval } from '../../../components/controls/select_interval';
import { useTableSeverity } from '../../../components/controls/select_severity';
import { MlPageHeader } from '../../../components/page_header';
import { PageTitle } from '../../../components/page_title';
import { AnomalyResultsViewSelector } from '../../../components/anomaly_results_view_selector';
import { AnomalyDetectionEmptyState } from '../../../jobs/jobs_list/components/anomaly_detection_empty_state';
import { useAnomalyExplorerContext } from '../../../explorer/anomaly_explorer_context';

export interface ExplorerUrlStateManagerProps {
  jobsWithTimeRange: MlJobWithTimeRange[];
}

export const ExplorerUrlStateManager: FC<ExplorerUrlStateManagerProps> = ({
  jobsWithTimeRange,
}) => {
  const {
    services: { cases, uiSettings, mlServices },
  } = useMlKibana();
  const { mlApi } = mlServices;

  const [globalState] = useUrlState('_g');
  const [stoppedPartitions, setStoppedPartitions] = useState<string[] | undefined>();
  const [invalidTimeRangeError, setInValidTimeRangeError] = useState<boolean>(false);

  const timeBuckets = useTimeBuckets(uiSettings);
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const { jobIds } = useJobSelection(jobsWithTimeRange);
  const selectedJobsRunning = jobsWithTimeRange.some(
    (job) => jobIds.includes(job.id) && job.isRunning === true
  );

  const anomalyExplorerContext = useAnomalyExplorerContext();
  const { explorerService } = anomalyExplorerContext;
  const explorerState = useObservable(anomalyExplorerContext.explorerService.state$);

  const refresh = useRefresh();
  const lastRefresh = refresh?.lastRefresh ?? 0;

  // We cannot simply infer bounds from the globalState's `time` attribute
  // with `moment` since it can contain custom strings such as `now-15m`.
  // So when globalState's `time` changes, we update the timefilter and use
  // `timefilter.getBounds()` to update `bounds` in this component's state.
  useEffect(() => {
    if (globalState?.time !== undefined) {
      if (globalState.time.mode === 'invalid') {
        setInValidTimeRangeError(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]);

  const getJobsWithStoppedPartitions = useCallback(async (selectedJobIds: string[]) => {
    try {
      const fetchedStoppedPartitions = await mlApi.results.getCategoryStoppedPartitions(
        selectedJobIds,
        ML_JOB_ID
      );
      if (
        fetchedStoppedPartitions &&
        Array.isArray(fetchedStoppedPartitions.jobs) &&
        fetchedStoppedPartitions.jobs.length > 0
      ) {
        setStoppedPartitions(fetchedStoppedPartitions.jobs);
      } else {
        setStoppedPartitions(undefined);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function handleJobSelection() {
      if (jobIds.length > 0) {
        explorerService.updateJobSelection(jobIds);
        getJobsWithStoppedPartitions(jobIds);
      } else {
        explorerService.clearJobs();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(jobIds)]
  );

  useEffect(() => {
    return () => {
      // upon component unmounting
      // clear any data to prevent next page from rendering old charts
      explorerService.clearExplorerData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [explorerData, loadExplorerData] = useExplorerData();

  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      explorerService.setExplorerData(explorerData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerData]);

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const showCharts = useObservable(
    anomalyExplorerContext.chartsStateService.getShowCharts$(),
    anomalyExplorerContext.chartsStateService.getShowCharts()
  );

  const selectedCells = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getSelectedCells$(),
    anomalyExplorerContext.anomalyTimelineStateService.getSelectedCells()
  );

  const viewByFieldName = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getViewBySwimlaneFieldName$()
  );

  const swimLaneSeverity = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getSwimLaneSeverity$(),
    anomalyExplorerContext.anomalyTimelineStateService.getSwimLaneSeverity()
  );

  const influencersFilterQuery = useObservable(
    anomalyExplorerContext.anomalyExplorerCommonStateService.getInfluencerFilterQuery$()
  );

  const loadExplorerDataConfig =
    explorerState !== undefined
      ? {
          lastRefresh,
          influencersFilterQuery,
          noInfluencersConfigured: explorerState.noInfluencersConfigured,
          selectedCells,
          selectedJobs: explorerState.selectedJobs,
          tableInterval: tableInterval.val,
          tableSeverity: tableSeverity.val,
          viewBySwimlaneFieldName: viewByFieldName,
        }
      : undefined;

  useEffect(
    function updateAnomalyExplorerCommonState() {
      anomalyExplorerContext.anomalyExplorerCommonStateService.setSelectedJobs(
        loadExplorerDataConfig?.selectedJobs!
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadExplorerDataConfig]
  );

  useEffect(() => {
    if (!loadExplorerDataConfig || loadExplorerDataConfig?.selectedCells === undefined) return;
    loadExplorerData(loadExplorerDataConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(loadExplorerDataConfig)]);

  const overallSwimlaneData = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getOverallSwimLaneData$(),
    null
  );

  if (explorerState === undefined || refresh === undefined) {
    return null;
  }

  const CasesContext = cases?.ui.getCasesContext() ?? React.Fragment;

  const casesPermissions = cases?.helpers.canUseCases();

  return (
    <div className="ml-explorer">
      <MlPageHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <AnomalyResultsViewSelector
              viewId="explorer"
              selectedJobs={explorerState.selectedJobs}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PageTitle
              title={i18n.translate('xpack.ml.explorer.pageTitle', {
                defaultMessage: 'Anomaly Explorer',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <CasesContext owner={[]} permissions={casesPermissions!}>
        {jobsWithTimeRange.length === 0 ? (
          <AnomalyDetectionEmptyState />
        ) : (
          <Explorer
            {...{
              explorerState,
              overallSwimlaneData,
              showCharts,
              severity: tableSeverity.val,
              stoppedPartitions,
              invalidTimeRangeError,
              selectedJobsRunning,
              timeBuckets,
              timefilter,
              selectedCells,
              swimLaneSeverity,
            }}
          />
        )}
      </CasesContext>
    </div>
  );
};
