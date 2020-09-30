/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
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
import { ExplorerAppState } from '../../../../common/types/ml_url_generator';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { getDateFormatTz } from '../../explorer/explorer_utils';
import { useJobSelection } from '../../components/job_selector/use_job_selection';
import { useShowCharts } from '../../components/controls/checkbox_showcharts';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';
import { useUrlState } from '../../util/url_state';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { useTimefilter } from '../../contexts/kibana';
import { isViewBySwimLaneData } from '../../explorer/swimlane_container';
import { JOB_ID } from '../../../../common/constants/anomalies';

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

  return (
    <PageLoader context={context}>
      <ExplorerUrlStateManager jobsWithTimeRange={results.jobsWithTimeRange.jobs} />
    </PageLoader>
  );
};

interface ExplorerUrlStateManagerProps {
  jobsWithTimeRange: MlJobWithTimeRange[];
}

const ExplorerUrlStateManager: FC<ExplorerUrlStateManagerProps> = ({ jobsWithTimeRange }) => {
  const [appState, setAppState] = useUrlState('_a');
  const [globalState, setGlobalState] = useUrlState('_g');
  const [lastRefresh, setLastRefresh] = useState(0);
  const [stoppedPartitions, setStoppedPartitions] = useState<string[] | undefined>();
  const [invalidTimeRangeError, setInValidTimeRangeError] = useState<boolean>(false);
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const { jobIds } = useJobSelection(jobsWithTimeRange);

  const refresh = useRefresh();
  useEffect(() => {
    if (refresh !== undefined) {
      setLastRefresh(refresh?.lastRefresh);

      if (refresh.timeRange !== undefined) {
        const { start, end } = refresh.timeRange;
        setGlobalState('time', {
          from: start,
          to: end,
        });
      }
    }
  }, [refresh?.lastRefresh]);

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

      const timefilterBounds = timefilter.getBounds();
      // Only if both min/max bounds are valid moment times set the bounds.
      // An invalid string restored from globalState might return `undefined`.
      if (timefilterBounds?.min !== undefined && timefilterBounds?.max !== undefined) {
        explorerService.setBounds(timefilterBounds);
      }
    }
  }, [globalState?.time?.from, globalState?.time?.to]);

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
    const viewByFieldName = appState?.mlExplorerSwimlane?.viewByFieldName;
    if (viewByFieldName !== undefined) {
      explorerService.setViewBySwimlaneFieldName(viewByFieldName);
    }

    const filterData = appState?.mlExplorerFilter;
    if (filterData !== undefined) {
      explorerService.setFilterData(filterData);
    }

    const viewByPerPage = (appState as ExplorerAppState)?.mlExplorerSwimlane?.viewByPerPage;
    if (viewByPerPage) {
      explorerService.setViewByPerPage(viewByPerPage);
    }

    const viewByFromPage = (appState as ExplorerAppState)?.mlExplorerSwimlane?.viewByFromPage;
    if (viewByFromPage) {
      explorerService.setViewByFromPage(viewByFromPage);
    }
  }, []);

  const [explorerData, loadExplorerData] = useExplorerData();
  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      explorerService.setExplorerData(explorerData);
    }
  }, [explorerData]);

  const explorerAppState = useObservable(explorerService.appState$);
  useEffect(() => {
    if (
      explorerAppState !== undefined &&
      explorerAppState.mlExplorerSwimlane.viewByFieldName !== undefined
    ) {
      setAppState(explorerAppState);
    }
  }, [explorerAppState]);

  const explorerState = useObservable(explorerService.state$);
  const [showCharts] = useShowCharts();
  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const [selectedCells, setSelectedCells] = useSelectedCells(appState, setAppState);
  useEffect(() => {
    explorerService.setSelectedCells(selectedCells);
  }, [JSON.stringify(selectedCells)]);

  const loadExplorerDataConfig =
    (explorerState !== undefined && {
      bounds: explorerState.bounds,
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
    }) ||
    undefined;

  useEffect(() => {
    if (explorerState && explorerState.swimlaneContainerWidth > 0) {
      loadExplorerData({
        ...loadExplorerDataConfig,
        swimlaneLimit:
          isViewBySwimLaneData(explorerState?.viewBySwimlaneData) &&
          explorerState?.viewBySwimlaneData.cardinality,
      });
    }
  }, [JSON.stringify(loadExplorerDataConfig)]);

  if (explorerState === undefined || refresh === undefined || showCharts === undefined) {
    return null;
  }

  return (
    <div className="ml-explorer">
      <Explorer
        {...{
          explorerState,
          setSelectedCells,
          showCharts,
          severity: tableSeverity.val,
          stoppedPartitions,
          invalidTimeRangeError,
        }}
      />
    </div>
  );
};
