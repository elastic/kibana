/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import moment from 'moment';

import { i18n } from '@kbn/i18n';

import { NavigateToPath, useNotifications } from '../../contexts/kibana';

import { MlJobWithTimeRange } from '../../../../common/types/anomaly_detection_jobs';

import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { getDateFormatTz } from '../../explorer/explorer_utils';
import { ml } from '../../services/ml_api_service';
import { mlJobService } from '../../services/job_service';
import { mlForecastService } from '../../services/forecast_service';
import { APP_STATE_ACTION } from '../../timeseriesexplorer/timeseriesexplorer_constants';
import {
  createTimeSeriesJobData,
  getAutoZoomDuration,
  validateJobSelection,
} from '../../timeseriesexplorer/timeseriesexplorer_utils';
import { TimeSeriesExplorerPage } from '../../timeseriesexplorer/timeseriesexplorer_page';
import { TimeseriesexplorerNoJobsFound } from '../../timeseriesexplorer/components/timeseriesexplorer_no_jobs_found';
import { useUrlState } from '../../util/url_state';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { useTimefilter } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { AnnotationUpdatesService } from '../../services/annotations_service';
import { MlAnnotationUpdatesContext } from '../../contexts/ml/ml_annotation_updates_context';
import { useTimeSeriesExplorerUrlState } from '../../timeseriesexplorer/hooks/use_timeseriesexplorer_url_state';
import type { TimeSeriesExplorerAppState } from '../../../../common/types/locator';
import type { TimeRangeBounds } from '../../util/time_buckets';
import { useJobSelectionFlyout } from '../../contexts/ml/use_job_selection_flyout';
import { useRefresh } from '../use_refresh';
import { TimeseriesexplorerNoChartData } from '../../timeseriesexplorer/components/timeseriesexplorer_no_chart_data';

export const timeSeriesExplorerRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'timeseriesexplorer',
  path: '/timeseriesexplorer',
  title: i18n.translate('xpack.ml.anomalyDetection.singleMetricViewerLabel', {
    defaultMessage: 'Single Metric Viewer',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.singleMetricViewerLabel', {
        defaultMessage: 'Single Metric Viewer',
      }),
    },
  ],
  enableDatePicker: true,
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
        <TimeSeriesExplorerUrlStateManager
          config={deps.config}
          jobsWithTimeRange={results.jobsWithTimeRange.jobs}
        />
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};

type AppStateZoom = Exclude<TimeSeriesExplorerAppState['mlTimeSeriesExplorer'], undefined>['zoom'];

interface TimeSeriesExplorerUrlStateManager {
  config: any;
  jobsWithTimeRange: MlJobWithTimeRange[];
}

export const TimeSeriesExplorerUrlStateManager: FC<TimeSeriesExplorerUrlStateManager> = ({
  config,
  jobsWithTimeRange,
}) => {
  const { toasts } = useNotifications();
  const toastNotificationService = useToastNotificationService();
  const [timeSeriesExplorerUrlState, setTimeSeriesExplorerUrlState] =
    useTimeSeriesExplorerUrlState();
  const [globalState, setGlobalState] = useUrlState('_g');
  const [selectedJobId, setSelectedJobId] = useState<string>();
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });
  const [invalidTimeRangeError, setInValidTimeRangeError] = useState<boolean>(false);

  const refresh = useRefresh();
  const previousRefresh = usePrevious(refresh?.lastRefresh ?? 0);

  // We cannot simply infer bounds from the globalState's `time` attribute
  // with `moment` since it can contain custom strings such as `now-15m`.
  // So when globalState's `time` changes, we update the timefilter and use
  // `timefilter.getBounds()` to update `bounds` in this component's state.
  const [bounds, setBounds] = useState<TimeRangeBounds | undefined>(undefined);
  useEffect(() => {
    if (globalState?.time !== undefined) {
      if (globalState.time.mode === 'invalid') {
        setInValidTimeRangeError(true);
      }

      const timefilterBounds = timefilter.getBounds();
      // Only if both min/max bounds are valid moment times set the bounds.
      // An invalid string restored from globalState might return `undefined`.
      if (timefilterBounds?.min !== undefined && timefilterBounds?.max !== undefined) {
        setBounds(timefilter.getBounds());
      }
    }
  }, [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]);

  const selectedJobIds = globalState?.ml?.jobIds;

  // Sort selectedJobIds so we can be sure comparison works when stringifying.
  if (Array.isArray(selectedJobIds)) {
    selectedJobIds.sort();
  }

  // When changing jobs we'll clear appState (detectorIndex, entities, forecastId).
  // To restore settings from the URL on initial load we also need to check against
  // `previousSelectedJobIds` to avoid wiping appState.
  const previousSelectedJobIds = usePrevious(selectedJobIds);
  const isJobChange = !isEqual(previousSelectedJobIds, selectedJobIds);

  // Next we get globalState and appState information to pass it on as props later.
  // If a job change is going on, we fall back to defaults (as if appState was already cleared),
  // otherwise the page could break.
  const selectedDetectorIndex = isJobChange
    ? 0
    : timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.detectorIndex ?? 0;
  const selectedEntities = isJobChange
    ? undefined
    : timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.entities;
  const selectedForecastId = isJobChange
    ? undefined
    : timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.forecastId;
  const selectedFunctionDescription = isJobChange
    ? undefined
    : timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.functionDescription;
  const zoom: AppStateZoom | undefined = isJobChange
    ? undefined
    : timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.zoom;

  const selectedJob = selectedJobId !== undefined ? mlJobService.getJob(selectedJobId) : undefined;
  const timeSeriesJobs = createTimeSeriesJobData(mlJobService.jobs);

  let autoZoomDuration: number | undefined;
  if (selectedJobId !== undefined && selectedJob !== undefined) {
    autoZoomDuration = getAutoZoomDuration(timeSeriesJobs, selectedJob);
  }

  const appStateHandler = useCallback(
    (action: string, payload?: any) => {
      /**
       * Empty zoom indicates that chart hasn't been rendered yet,
       * hence any updates prior that should replace the URL state.
       */
      const isInitUpdate = timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.zoom === undefined;

      const mlTimeSeriesExplorer: TimeSeriesExplorerAppState['mlTimeSeriesExplorer'] =
        timeSeriesExplorerUrlState?.mlTimeSeriesExplorer !== undefined
          ? { ...timeSeriesExplorerUrlState.mlTimeSeriesExplorer }
          : {};

      switch (action) {
        case APP_STATE_ACTION.CLEAR:
          delete mlTimeSeriesExplorer.detectorIndex;
          delete mlTimeSeriesExplorer.entities;
          delete mlTimeSeriesExplorer.forecastId;
          delete mlTimeSeriesExplorer.zoom;
          delete mlTimeSeriesExplorer.functionDescription;
          break;

        case APP_STATE_ACTION.SET_DETECTOR_INDEX:
          mlTimeSeriesExplorer.detectorIndex = payload;
          delete mlTimeSeriesExplorer.functionDescription;

          break;

        case APP_STATE_ACTION.SET_ENTITIES:
          mlTimeSeriesExplorer.entities = payload;
          delete mlTimeSeriesExplorer.functionDescription;

          break;

        case APP_STATE_ACTION.SET_FORECAST_ID:
          mlTimeSeriesExplorer.forecastId = payload;
          delete mlTimeSeriesExplorer.zoom;
          break;

        case APP_STATE_ACTION.SET_ZOOM:
          mlTimeSeriesExplorer.zoom = payload;
          break;

        case APP_STATE_ACTION.UNSET_ZOOM:
          delete mlTimeSeriesExplorer.zoom;
          break;

        case APP_STATE_ACTION.SET_FUNCTION_DESCRIPTION:
          mlTimeSeriesExplorer.functionDescription = payload;
          break;
      }

      setTimeSeriesExplorerUrlState({ mlTimeSeriesExplorer }, isInitUpdate);
    },
    [
      JSON.stringify(timeSeriesExplorerUrlState?.mlTimeSeriesExplorer),
      setTimeSeriesExplorerUrlState,
    ]
  );

  const getJobSelection = useJobSelectionFlyout();

  // Use a side effect to clear appState when changing jobs.
  useEffect(() => {
    if (selectedJobIds !== undefined && previousSelectedJobIds !== undefined) {
      appStateHandler(APP_STATE_ACTION.CLEAR);
    }
    const validatedJobId = validateJobSelection(
      jobsWithTimeRange,
      selectedJobIds,
      setGlobalState,
      toasts,
      getJobSelection
    );
    if (typeof validatedJobId === 'string') {
      setSelectedJobId(validatedJobId);
    }
  }, [JSON.stringify(selectedJobIds)]);

  const boundsMinMs = bounds?.min?.valueOf();
  const boundsMaxMs = bounds?.max?.valueOf();

  const [selectedForecastIdProp, setSelectedForecastIdProp] = useState<string | undefined>(
    timeSeriesExplorerUrlState?.mlTimeSeriesExplorer?.forecastId
  );

  useEffect(() => {
    if (
      autoZoomDuration !== undefined &&
      boundsMinMs !== undefined &&
      boundsMaxMs !== undefined &&
      selectedJob !== undefined &&
      selectedForecastId !== undefined
    ) {
      if (selectedForecastIdProp !== selectedForecastId) {
        setSelectedForecastIdProp(undefined);
      }
      mlForecastService
        .getForecastDateRange(selectedJob, selectedForecastId)
        .then((resp) => {
          if (autoZoomDuration === undefined) {
            return;
          }

          const earliest = moment(resp.earliest || boundsMinMs);
          const latest = moment(resp.latest || boundsMaxMs);

          if (earliest.isBefore(moment(boundsMinMs)) || latest.isAfter(moment(boundsMaxMs))) {
            const earliestMs = Math.min(earliest.valueOf(), boundsMinMs);
            const latestMs = Math.max(latest.valueOf(), boundsMaxMs);

            // FIXME we should not update global state here
            setGlobalState('time', {
              from: moment(earliestMs).toISOString(),
              to: moment(latestMs).toISOString(),
            });
          }
          setSelectedForecastIdProp(selectedForecastId);
        })
        .catch((resp) => {
          // eslint-disable-next-line no-console
          console.error(
            'Time series explorer - error loading time range of forecast from elasticsearch:',
            resp
          );
        });
    }
  }, [selectedForecastId]);

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  if (timeSeriesJobs.length === 0) {
    return (
      <TimeSeriesExplorerPage dateFormatTz={dateFormatTz} noSingleMetricJobsFound>
        <TimeseriesexplorerNoJobsFound />
      </TimeSeriesExplorerPage>
    );
  }

  if (!bounds) {
    return (
      <TimeSeriesExplorerPage>
        <TimeseriesexplorerNoChartData />
      </TimeSeriesExplorerPage>
    );
  }

  const zoomProp: AppStateZoom | undefined =
    typeof selectedForecastId === 'string' && selectedForecastIdProp === undefined
      ? undefined
      : zoom;

  return (
    <TimeSeriesExplorer
      {...{
        toastNotificationService,
        appStateHandler,
        autoZoomDuration,
        bounds,
        dateFormatTz,
        lastRefresh: refresh?.lastRefresh ?? 0,
        previousRefresh,
        selectedJobId,
        selectedDetectorIndex,
        selectedEntities,
        selectedForecastId: selectedForecastIdProp,
        tableInterval: tableInterval.val,
        tableSeverity: tableSeverity.val,
        timefilter,
        zoom: zoomProp,
        invalidTimeRangeError,
        functionDescription: selectedFunctionDescription,
      }}
    />
  );
};
