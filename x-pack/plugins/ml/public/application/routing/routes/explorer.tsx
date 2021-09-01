/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { i18n } from '@kbn/i18n';

import { NavigateToPath } from '../../contexts/kibana';

import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useRefresh } from '../use_refresh';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { useSelectedCells } from '../../explorer/hooks/use_selected_cells';
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
import { isViewBySwimLaneData } from '../../explorer/swimlane_container';
import { JOB_ID } from '../../../../common/constants/anomalies';
import { MlAnnotationUpdatesContext } from '../../contexts/ml/ml_annotation_updates_context';
import { AnnotationUpdatesService } from '../../services/annotations_service';
import { useExplorerUrlState } from '../../explorer/hooks/use_explorer_url_state';
import { useTimeBuckets } from '../../components/custom_hooks/use_time_buckets';

export const explorerRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/explorer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.anomalyExplorerLabel', {
        defaultMessage: 'Anomaly Explorer',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context, results } = useResolver(undefined, undefined, deps.config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
    jobsWithTimeRange: () => ml.jobs.jobsWithTimerange(getDateFormatTz()),
  });
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
  const [explorerUrlState, setExplorerUrlState] = useExplorerUrlState();

  const [globalState, setGlobalState] = useUrlState('_g');
  const [lastRefresh, setLastRefresh] = useState(0);
  const [stoppedPartitions, setStoppedPartitions] = useState<string[] | undefined>();
  const [invalidTimeRangeError, setInValidTimeRangeError] = useState<boolean>(false);

  const timeBuckets = useTimeBuckets();
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const { jobIds } = useJobSelection(jobsWithTimeRange);
  const selectedJobsRunning = jobsWithTimeRange.some(
    (job) => jobIds.includes(job.id) && job.isRunning === true
  );

  const explorerAppState = useObservable(explorerService.appState$);
  const explorerState = useObservable(explorerService.state$);

  const refresh = useRefresh();

  useEffect(() => {
    if (refresh !== undefined && lastRefresh !== refresh.lastRefresh) {
      setLastRefresh(refresh?.lastRefresh);

      if (refresh.timeRange !== undefined) {
        const { start, end } = refresh.timeRange;
        setGlobalState('time', {
          from: start,
          to: end,
          ...(start === 'now' || end === 'now' ? { ts: Date.now() } : {}),
        });
      }
    }
  }, [refresh?.lastRefresh, lastRefresh, setLastRefresh, setGlobalState]);

  // We cannot simply infer bounds from the globalState's `time` attribute
  // with `moment` since it can contain custom strings such as `now-15m`.
  // So when globalState's `time` changes, we update the timefilter and use
  // `timefilter.getBounds()` to update `bounds` in this component's state.
  useEffect(() => {
    if (globalState?.time !== undefined) {
      if (globalState.time.mode === 'invalid') {
        setInValidTimeRangeError(true);
      }
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
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

  useEffect(() => {
    if (jobIds.length > 0) {
      explorerService.updateJobSelection(jobIds);
      getJobsWithStoppedPartitions(jobIds);
    } else {
      explorerService.clearJobs();
    }
  }, [JSON.stringify(jobIds)]);

  useEffect(() => {
    return () => {
      // upon component unmounting
      // clear any data to prevent next page from rendering old charts
      explorerService.clearExplorerData();
    };
  }, []);

  /**
   * TODO get rid of the intermediate state in explorerService.
   * URL state should be the only source of truth for related props.
   */
  useEffect(() => {
    const filterData = explorerUrlState?.mlExplorerFilter;
    if (filterData !== undefined) {
      explorerService.setFilterData(filterData);
    }

    const { viewByFieldName, viewByFromPage, viewByPerPage, severity } =
      explorerUrlState?.mlExplorerSwimlane ?? {};

    if (viewByFieldName !== undefined) {
      explorerService.setViewBySwimlaneFieldName(viewByFieldName);
    }

    if (viewByPerPage !== undefined) {
      explorerService.setViewByPerPage(viewByPerPage);
    }

    if (viewByFromPage !== undefined) {
      explorerService.setViewByFromPage(viewByFromPage);
    }

    if (severity !== undefined) {
      explorerService.setSwimLaneSeverity(severity);
    }

    if (explorerUrlState.mlShowCharts !== undefined) {
      explorerService.setShowCharts(explorerUrlState.mlShowCharts);
    }
  }, []);

  /** Sync URL state with {@link explorerService} state */
  useEffect(() => {
    const replaceState = explorerUrlState?.mlExplorerSwimlane?.viewByFieldName === undefined;
    if (explorerAppState?.mlExplorerSwimlane?.viewByFieldName !== undefined) {
      setExplorerUrlState(explorerAppState, replaceState);
    }
  }, [explorerAppState]);

  const [explorerData, loadExplorerData] = useExplorerData();

  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      explorerService.setExplorerData(explorerData);
    }
  }, [explorerData]);

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const [selectedCells, setSelectedCells] = useSelectedCells(
    explorerUrlState,
    setExplorerUrlState,
    explorerState?.swimlaneBucketInterval?.asSeconds()
  );

  useEffect(() => {
    explorerService.setSelectedCells(selectedCells);
  }, [JSON.stringify(selectedCells)]);

  const loadExplorerDataConfig =
    explorerState !== undefined
      ? {
          lastRefresh,
          influencersFilterQuery: explorerState.influencersFilterQuery,
          noInfluencersConfigured: explorerState.noInfluencersConfigured,
          selectedCells,
          selectedJobs: explorerState.selectedJobs,
          swimlaneBucketInterval: explorerState.swimlaneBucketInterval,
          tableInterval: tableInterval.val,
          tableSeverity: tableSeverity.val,
          viewBySwimlaneFieldName: explorerState.viewBySwimlaneFieldName,
          swimlaneContainerWidth: explorerState.swimlaneContainerWidth,
          viewByPerPage: explorerState.viewByPerPage,
          viewByFromPage: explorerState.viewByFromPage,
          swimLaneSeverity: explorerState.swimLaneSeverity,
        }
      : undefined;

  useEffect(() => {
    /**
     * For the "View by" swim lane the limit is the cardinality of the influencer values,
     * which is known after the initial fetch.
     * When looking up for top influencers for selected range in Overall swim lane
     * the result is filtered by top influencers values, hence there is no need to set the limit.
     */
    const swimlaneLimit =
      isViewBySwimLaneData(explorerState?.viewBySwimlaneData) && !selectedCells?.showTopFieldValues
        ? explorerState?.viewBySwimlaneData.cardinality
        : undefined;

    if (explorerState && explorerState.swimlaneContainerWidth > 0) {
      loadExplorerData({
        ...loadExplorerDataConfig,
        swimlaneLimit,
      });
    }
  }, [JSON.stringify(loadExplorerDataConfig), selectedCells?.showTopFieldValues]);

  if (
    explorerState === undefined ||
    refresh === undefined ||
    explorerAppState?.mlShowCharts === undefined
  ) {
    return null;
  }

  return (
    <div className="ml-explorer">
      <Explorer
        {...{
          explorerState,
          setSelectedCells,
          showCharts: explorerState.showCharts,
          severity: tableSeverity.val,
          stoppedPartitions,
          invalidTimeRangeError,
          selectedJobsRunning,
          timeBuckets,
          timefilter,
        }}
      />
    </div>
  );
};
