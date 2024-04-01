/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { EuiResizeObserver } from '@elastic/eui';
import type { Observable } from 'rxjs';
import { throttle } from 'lodash';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import usePrevious from 'react-use/lib/usePrevious';
import { useToastNotificationService } from '../../application/services/toast_notification_service';
import { useEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { useSingleMetricViewerInputResolver } from './use_single_metric_viewer_input_resolver';
import type { ISingleMetricViewerEmbeddable } from './single_metric_viewer_embeddable';
import type {
  SingleMetricViewerEmbeddableInput,
  AnomalyChartsEmbeddableOutput,
  SingleMetricViewerEmbeddableServices,
} from '..';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import { TimeSeriesExplorerEmbeddableChart } from '../../application/timeseriesexplorer/timeseriesexplorer_embeddable_chart';
import { APP_STATE_ACTION } from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
import { useTimeSeriesExplorerService } from '../../application/util/time_series_explorer_service';
import './_index.scss';

const RESIZE_THROTTLE_TIME_MS = 500;

interface AppStateZoom {
  from?: string;
  to?: string;
}

export interface EmbeddableSingleMetricViewerContainerProps {
  id: string;
  embeddableContext: InstanceType<ISingleMetricViewerEmbeddable>;
  embeddableInput: Observable<SingleMetricViewerEmbeddableInput>;
  services: SingleMetricViewerEmbeddableServices;
  refresh: Observable<void>;
  onInputChange: (input: Partial<SingleMetricViewerEmbeddableInput>) => void;
  onOutputChange: (output: Partial<AnomalyChartsEmbeddableOutput>) => void;
  onRenderComplete: () => void;
  onLoading: () => void;
  onError: (error: Error) => void;
}

export const EmbeddableSingleMetricViewerContainer: FC<
  EmbeddableSingleMetricViewerContainerProps
> = ({ id, embeddableContext, embeddableInput, services, refresh, onRenderComplete }) => {
  useEmbeddableExecutionContext<SingleMetricViewerEmbeddableInput>(
    services[0].executionContext,
    embeddableInput,
    ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
    id
  );
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [zoom, setZoom] = useState<AppStateZoom | undefined>();
  const [selectedForecastId, setSelectedForecastId] = useState<string | undefined>();
  const [detectorIndex, setDetectorIndex] = useState<number>(0);
  const [selectedJob, setSelectedJob] = useState<MlJob | undefined>();
  const [autoZoomDuration, setAutoZoomDuration] = useState<number | undefined>();
  const [jobsLoaded, setJobsLoaded] = useState(false);

  const { mlApiServices, mlJobService } = services[2];
  const { data, bounds, lastRefresh } = useSingleMetricViewerInputResolver(
    embeddableInput,
    refresh,
    services[1].data.query.timefilter.timefilter,
    onRenderComplete
  );
  const selectedJobId = data?.jobIds[0];
  // Need to make sure we fall back to `undefined` if `functionDescription` is an empty string,
  // otherwise anomaly table data will not be loaded.
  const functionDescription =
    (data?.functionDescription ?? '') === '' ? undefined : data.functionDescription;
  const previousRefresh = usePrevious(lastRefresh ?? 0);
  const mlTimeSeriesExplorer = useTimeSeriesExplorerService();

  // Holds the container height for previously fetched data
  const containerHeightRef = useRef<number>();
  const toastNotificationService = useToastNotificationService();

  useEffect(function setUpJobsLoaded() {
    async function loadJobs() {
      await mlJobService.loadJobsWrapper();
      setJobsLoaded(true);
    }
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function setUpSelectedJob() {
      async function fetchSelectedJob() {
        if (mlApiServices && selectedJobId !== undefined) {
          const { jobs } = await mlApiServices.getJobs({ jobId: selectedJobId });
          const job = jobs[0];
          setSelectedJob(job);
        }
      }
      fetchSelectedJob();
    },
    [selectedJobId, mlApiServices]
  );

  useEffect(
    function setUpAutoZoom() {
      let zoomDuration: number | undefined;
      if (selectedJobId !== undefined && selectedJob !== undefined) {
        zoomDuration = mlTimeSeriesExplorer.getAutoZoomDuration(selectedJob);
        setAutoZoomDuration(zoomDuration);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedJobId, selectedJob?.job_id, mlTimeSeriesExplorer]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      // Keep previous container height so it doesn't change the page layout
      containerHeightRef.current = e.height;

      if (Math.abs(chartWidth - e.width) > 20) {
        setChartWidth(e.width);
      }
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  const appStateHandler = useCallback(
    (action: string, payload?: any) => {
      /**
       * Empty zoom indicates that chart hasn't been rendered yet,
       * hence any updates prior that should replace the URL state.
       */

      switch (action) {
        case APP_STATE_ACTION.SET_DETECTOR_INDEX:
          setDetectorIndex(payload);
          break;

        case APP_STATE_ACTION.SET_FORECAST_ID:
          setSelectedForecastId(payload);
          setZoom(undefined);
          break;

        case APP_STATE_ACTION.SET_ZOOM:
          setZoom(payload);
          break;

        case APP_STATE_ACTION.UNSET_ZOOM:
          setZoom(undefined);
          break;
      }
    },

    [setZoom, setDetectorIndex, setSelectedForecastId]
  );

  const containerPadding = 10;

  return (
    <EuiResizeObserver onResize={resizeHandler}>
      {(resizeRef) => (
        <div
          id={`mlSingleMetricViewerEmbeddableWrapper-${id}`}
          style={{
            width: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '8px',
          }}
          data-test-subj={`mlSingleMetricViewer_${embeddableContext.id}`}
          ref={resizeRef}
          className="ml-time-series-explorer"
        >
          {data !== undefined && autoZoomDuration !== undefined && jobsLoaded && (
            <TimeSeriesExplorerEmbeddableChart
              chartWidth={chartWidth - containerPadding}
              dataViewsService={services[1].data.dataViews}
              toastNotificationService={toastNotificationService}
              appStateHandler={appStateHandler}
              autoZoomDuration={autoZoomDuration}
              bounds={bounds}
              dateFormatTz={moment.tz.guess()}
              lastRefresh={lastRefresh ?? 0}
              previousRefresh={previousRefresh}
              selectedJobId={selectedJobId}
              selectedDetectorIndex={detectorIndex}
              selectedEntities={data.selectedEntities}
              selectedForecastId={selectedForecastId}
              tableInterval="auto"
              tableSeverity={0}
              zoom={zoom}
              functionDescription={functionDescription}
              selectedJob={selectedJob}
            />
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableSingleMetricViewerContainer;
