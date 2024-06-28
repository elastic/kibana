/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiResizeObserver } from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import usePrevious from 'react-use/lib/usePrevious';
import { tz } from 'moment';
import { pick, throttle } from 'lodash';
import type { MlDependencies } from '../../application/app';
import { TimeSeriesExplorerEmbeddableChart } from '../../application/timeseriesexplorer/timeseriesexplorer_embeddable_chart';
import { APP_STATE_ACTION } from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
import type { SingleMetricViewerServices, MlEntity } from '../../embeddables/types';
import './_index.scss';

const containerPadding = 10;
const minElemAndChartDiff = 20;
const RESIZE_THROTTLE_TIME_MS = 500;
interface AppStateZoom {
  from?: string;
  to?: string;
}

const errorMessage = i18n.translate('xpack.ml.singleMetricViewerEmbeddable.errorMessage"', {
  defaultMessage: 'Unable to load the ML single metric viewer data',
});

export type SingleMetricViewerSharedComponent = FC<SingleMetricViewerProps>;

/**
 * Only used to initialize internally
 */
export type SingleMetricViewerPropsWithDeps = SingleMetricViewerProps & {
  coreStart: CoreStart;
  pluginStart: MlDependencies;
  mlServices: SingleMetricViewerServices;
};

export interface SingleMetricViewerProps {
  bounds?: TimeRangeBounds;
  selectedEntities?: MlEntity;
  selectedDetectorIndex?: number;
  functionDescription?: string;
  selectedJobId: string | undefined;
  /**
   * Last reload request time, can be used for manual reload
   */
  lastRefresh?: number;
  onRenderComplete?: () => void;
  onError?: (error: Error) => void;
  uuid: string;
}

type Zoom = AppStateZoom | undefined;
type ForecastId = string | undefined;

const SingleMetricViewerWrapper: FC<SingleMetricViewerPropsWithDeps> = ({
  // Component dependencies
  coreStart,
  pluginStart,
  mlServices,
  // Component props
  bounds,
  functionDescription,
  lastRefresh,
  onError,
  onRenderComplete,
  selectedDetectorIndex,
  selectedEntities,
  selectedJobId,
  uuid,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [zoom, setZoom] = useState<Zoom>();
  const [selectedForecastId, setSelectedForecastId] = useState<ForecastId>();
  const [selectedJob, setSelectedJob] = useState<MlJob | undefined>();
  const [jobsLoaded, setJobsLoaded] = useState(false);

  const isMounted = useMountedState();

  const { mlApiServices, mlJobService, mlTimeSeriesExplorerService, toastNotificationService } =
    mlServices;
  const startServices = pick(coreStart, 'analytics', 'i18n', 'theme');
  const datePickerDeps: DatePickerDependencies = {
    ...pick(coreStart, ['http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    data: pluginStart.data,
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice: false,
  };

  const previousRefresh = usePrevious(lastRefresh ?? 0);

  useEffect(
    function setUpJobsLoaded() {
      async function loadJobs() {
        try {
          await mlJobService.loadJobsWrapper();
          setJobsLoaded(true);
        } catch (e) {
          if (onError) {
            onError(new Error(errorMessage));
          }
        }
      }
      if (isMounted() === false) {
        return;
      }
      loadJobs();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMounted]
  );

  useEffect(
    function setUpSelectedJob() {
      async function fetchSelectedJob() {
        if (mlApiServices && selectedJobId !== undefined) {
          try {
            const { jobs } = await mlApiServices.getJobs({ jobId: selectedJobId });
            const job = jobs[0];
            setSelectedJob(job);
          } catch (e) {
            if (onError) {
              onError(new Error(errorMessage));
            }
          }
        }
      }
      if (isMounted() === false) {
        return;
      }
      fetchSelectedJob();
    },
    [selectedJobId, mlApiServices, isMounted, onError]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      if (Math.abs(chartWidth - e.width) > minElemAndChartDiff) {
        setChartWidth(e.width);
      }
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  const autoZoomDuration = useMemo(() => {
    if (!selectedJob) return;
    return mlTimeSeriesExplorerService?.getAutoZoomDuration(selectedJob);
  }, [mlTimeSeriesExplorerService, selectedJob]);

  const appStateHandler = useCallback(
    (action: string, payload?: Zoom | ForecastId) => {
      /**
       * Empty zoom indicates that chart hasn't been rendered yet,
       * hence any updates prior that should replace the URL state.
       */
      switch (action) {
        case APP_STATE_ACTION.SET_FORECAST_ID:
          setSelectedForecastId(payload as ForecastId);
          setZoom(undefined);
          break;

        case APP_STATE_ACTION.SET_ZOOM:
          setZoom(payload as Zoom);
          break;

        case APP_STATE_ACTION.UNSET_ZOOM:
          setZoom(undefined);
          break;
      }
    },

    [setZoom, setSelectedForecastId]
  );

  return (
    <EuiResizeObserver onResize={resizeHandler}>
      {(resizeRef) => (
        <div
          id={`mlSingleMetricViewerEmbeddableWrapper-${uuid}`}
          style={{
            width: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '8px',
          }}
          data-test-subj={`mlSingleMetricViewer_${uuid}`}
          ref={resizeRef}
          className="ml-time-series-explorer"
          data-shared-item="" // TODO: Remove data-shared-item as part of https://github.com/elastic/kibana/issues/179376
          data-rendering-count={1}
        >
          <KibanaRenderContextProvider {...startServices}>
            <KibanaContextProvider
              services={{
                mlServices: {
                  ...mlServices,
                },
                ...coreStart,
                ...pluginStart,
              }}
            >
              <DatePickerContextProvider {...datePickerDeps}>
                {selectedJobId !== undefined &&
                  autoZoomDuration !== undefined &&
                  jobsLoaded &&
                  selectedJobId === selectedJob?.job_id && (
                    <TimeSeriesExplorerEmbeddableChart
                      chartWidth={chartWidth - containerPadding}
                      dataViewsService={pluginStart.data.dataViews}
                      toastNotificationService={toastNotificationService}
                      appStateHandler={appStateHandler}
                      autoZoomDuration={autoZoomDuration}
                      bounds={bounds}
                      dateFormatTz={tz.guess()}
                      lastRefresh={lastRefresh ?? 0}
                      previousRefresh={previousRefresh}
                      selectedJobId={selectedJobId}
                      selectedDetectorIndex={selectedDetectorIndex}
                      selectedEntities={selectedEntities}
                      selectedForecastId={selectedForecastId}
                      tableInterval="auto"
                      tableSeverity={0}
                      zoom={zoom}
                      functionDescription={functionDescription}
                      selectedJob={selectedJob}
                      onRenderComplete={onRenderComplete}
                    />
                  )}
              </DatePickerContextProvider>
            </KibanaContextProvider>
          </KibanaRenderContextProvider>
        </div>
      )}
    </EuiResizeObserver>
  );
};

// eslint-disable-next-line import/no-default-export
export default SingleMetricViewerWrapper;
