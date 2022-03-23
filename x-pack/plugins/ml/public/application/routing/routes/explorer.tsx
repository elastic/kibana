/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NavigateToPath } from '../../contexts/kibana';

import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useRefresh } from '../use_refresh';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { mlJobService } from '../../services/job_service';
import { ml } from '../../services/ml_api_service';
import { useExplorerData } from '../../explorer/actions';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { getDateFormatTz } from '../../explorer/explorer_utils';
import { useJobSelection } from '../../components/job_selector/use_job_selection';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';
import { useUrlState } from '../../util/url_state';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { useTimefilter } from '../../contexts/kibana';
import { JOB_ID } from '../../../../common/constants/anomalies';
import { MlAnnotationUpdatesContext } from '../../contexts/ml/ml_annotation_updates_context';
import { AnnotationUpdatesService } from '../../services/annotations_service';
import { useExplorerUrlState } from '../../explorer/hooks/use_explorer_url_state';
import { useTimeBuckets } from '../../components/custom_hooks/use_time_buckets';
import { MlPageHeader } from '../../components/page_header';
import { AnomalyResultsViewSelector } from '../../components/anomaly_results_view_selector';
import { AnomalyDetectionEmptyState } from '../../jobs/jobs_list/components/anomaly_detection_empty_state';
import {
  AnomalyExplorerContext,
  useAnomalyExplorerContextValue,
} from '../../explorer/anomaly_explorer_context';
import type { AnomalyExplorerSwimLaneUrlState } from '../../../../common/types/locator';

export const explorerRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'explorer',
  path: '/explorer',
  title: i18n.translate('xpack.ml.anomalyDetection.anomalyExplorer.docTitle', {
    defaultMessage: 'Anomaly Explorer',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.anomalyExplorerLabel', {
        defaultMessage: 'Anomaly Explorer',
      }),
    },
  ],
  enableDatePicker: true,
  'data-test-subj': 'mlPageAnomalyExplorer',
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context, results } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    {
      ...basicResolvers(deps),
      jobs: mlJobService.loadJobsWrapper,
      jobsWithTimeRange: () => ml.jobs.jobsWithTimerange(getDateFormatTz()),
    }
  );
  const annotationUpdatesService = useMemo(() => new AnnotationUpdatesService(), []);

  return (
    <PageLoader context={context}>
      <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
        <ExplorerUrlStateManager jobsWithTimeRange={results.jobsWithTimeRange.jobs} />
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};

interface ExplorerUrlStateManagerProps {
  jobsWithTimeRange: MlJobWithTimeRange[];
}

const ExplorerUrlStateManager: FC<ExplorerUrlStateManagerProps> = ({ jobsWithTimeRange }) => {
  const [explorerUrlState, setExplorerUrlState, explorerUrlStateService] = useExplorerUrlState();

  const anomalyExplorerContext = useAnomalyExplorerContextValue(explorerUrlStateService);

  const [globalState] = useUrlState('_g');
  const [stoppedPartitions, setStoppedPartitions] = useState<string[] | undefined>();
  const [invalidTimeRangeError, setInValidTimeRangeError] = useState<boolean>(false);

  const timeBuckets = useTimeBuckets();
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const { jobIds } = useJobSelection(jobsWithTimeRange);
  const selectedJobsRunning = jobsWithTimeRange.some(
    (job) => jobIds.includes(job.id) && job.isRunning === true
  );

  const explorerState = useObservable(explorerService.state$);

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
  }, [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]);

  const getJobsWithStoppedPartitions = useCallback(async (selectedJobIds: string[]) => {
    try {
      const fetchedStoppedPartitions = await ml.results.getCategoryStoppedPartitions(
        selectedJobIds,
        JOB_ID
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
  }, []);

  const updateSwimLaneUrlState = useCallback(
    (update: AnomalyExplorerSwimLaneUrlState | undefined, replaceState = false) => {
      const ccc = explorerUrlState?.mlExplorerSwimlane;
      const resultUpdate = replaceState ? update : { ...ccc, ...update };
      return setExplorerUrlState({
        ...explorerUrlState,
        mlExplorerSwimlane: resultUpdate,
      });
    },
    [explorerUrlState, setExplorerUrlState]
  );

  useEffect(
    // TODO URL state service should provide observable with updates
    // and immutable method for updates
    function updateAnomalyTimelineStateFromUrl() {
      const { anomalyTimelineStateService } = anomalyExplorerContext;

      anomalyTimelineStateService.updateSetStateCallback(updateSwimLaneUrlState);
      anomalyTimelineStateService.updateFromUrlState(explorerUrlState?.mlExplorerSwimlane);
    },
    [explorerUrlState?.mlExplorerSwimlane, updateSwimLaneUrlState]
  );

  useEffect(
    function handleJobSelection() {
      if (jobIds.length > 0) {
        explorerService.updateJobSelection(jobIds);
        getJobsWithStoppedPartitions(jobIds);
      } else {
        explorerService.clearJobs();
      }
    },
    [JSON.stringify(jobIds)]
  );

  useEffect(() => {
    return () => {
      // upon component unmounting
      // clear any data to prevent next page from rendering old charts
      explorerService.clearExplorerData();

      anomalyExplorerContext.anomalyExplorerCommonStateService.destroy();
      anomalyExplorerContext.anomalyTimelineStateService.destroy();
      anomalyExplorerContext.chartsStateService.destroy();
    };
  }, []);

  const [explorerData, loadExplorerData] = useExplorerData();

  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      explorerService.setExplorerData(explorerData);
    }
  }, [explorerData]);

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const showCharts = useObservable(
    anomalyExplorerContext.chartsStateService.getShowCharts$(),
    anomalyExplorerContext.chartsStateService.getShowCharts()
  );

  const selectedCells = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getSelectedCells$()
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
    [loadExplorerDataConfig]
  );

  useEffect(() => {
    loadExplorerData(loadExplorerDataConfig);
  }, [JSON.stringify(loadExplorerDataConfig)]);

  const overallSwimlaneData = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getOverallSwimLaneData$(),
    null
  );

  if (explorerState === undefined || refresh === undefined) {
    return null;
  }

  return (
    <div className="ml-explorer">
      <MlPageHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <AnomalyResultsViewSelector viewId="explorer" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage id="xpack.ml.explorer.pageTitle" defaultMessage="Anomaly Explorer" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <AnomalyExplorerContext.Provider value={anomalyExplorerContext}>
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
      </AnomalyExplorerContext.Provider>
    </div>
  );
};
