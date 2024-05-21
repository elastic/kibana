/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { EuiResizeObserver } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import moment from 'moment';
import {
  apiHasExecutionContext,
  initializeTimeRange,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import usePrevious from 'react-use/lib/usePrevious';
import { throttle } from 'lodash';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type {
  SingleMetricViewerRuntimeState,
  SingleMetricViewerEmbeddableApi,
  SingleMetricViewerEmbeddableState,
} from '../types';
import { initializeSingleMetricViewerControls } from './single_metric_viewer_controls_initializer';
import { initializeSingleMetricViewerDataFetcher } from './single_metric_viewer_data_fetcher';
import { TimeSeriesExplorerEmbeddableChart } from '../../application/timeseriesexplorer/timeseriesexplorer_embeddable_chart';
import { APP_STATE_ACTION } from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
import { getServices } from './get_services';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import './_index.scss';

const RESIZE_THROTTLE_TIME_MS = 500;
const containerPadding = 10;
const minElemAndChartDiff = 20;
interface AppStateZoom {
  from?: string;
  to?: string;
}

const errorMessage = i18n.translate('xpack.ml.singleMetricViewerEmbeddable.errorMessage"', {
  defaultMessage: 'Unable to load the ML single metric viewer data',
});

export const getSingleMetricViewerEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    SingleMetricViewerEmbeddableState,
    SingleMetricViewerEmbeddableApi,
    SingleMetricViewerRuntimeState
  > = {
    type: ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const services = await getServices(getStartServices);
      const subscriptions = new Subscription();
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const {
        api: timeRangeApi,
        comparators: timeRangeComparators,
        serialize: serializeTimeRange,
      } = initializeTimeRange(state);

      const {
        singleMetricViewerControlsApi,
        serializeSingleMetricViewerState,
        singleMetricViewerComparators,
        onSingleMetricViewerDestroy,
      } = initializeSingleMetricViewerControls(state, titlesApi);

      const dataLoading = new BehaviorSubject<boolean | undefined>(true);
      const blockingError = new BehaviorSubject<Error | undefined>(undefined);

      const api = buildApi(
        {
          isEditingEnabled: () => true,
          getTypeDisplayName: () =>
            i18n.translate('xpack.ml.singleMetricViewerEmbeddable.typeDisplayName', {
              defaultMessage: 'single metric viewer',
            }),
          onEdit: async () => {
            try {
              const { resolveEmbeddableSingleMetricViewerUserInput } = await import(
                './single_metric_viewer_setup_flyout'
              );
              const [coreStart, { data, share }, { mlApiServices }] = services;
              const result = await resolveEmbeddableSingleMetricViewerUserInput(
                coreStart,
                parentApi,
                uuid,
                { data, share },
                mlApiServices,
                {
                  ...serializeTitles(),
                  ...serializeSingleMetricViewerState(),
                }
              );

              singleMetricViewerControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          ...titlesApi,
          ...timeRangeApi,
          ...singleMetricViewerControlsApi,
          dataLoading,
          blockingError,
          serializeState: () => {
            return {
              rawState: {
                timeRange: undefined,
                ...serializeTitles(),
                ...serializeTimeRange(),
                ...serializeSingleMetricViewerState(),
              },
              references: [],
            };
          },
        },
        {
          ...timeRangeComparators,
          ...titleComparators,
          ...singleMetricViewerComparators,
        }
      );

      const { singleMetricViewerData$, onDestroy } = initializeSingleMetricViewerDataFetcher(
        api,
        dataLoading,
        blockingError,
        services[1].data.query.timefilter.timefilter
      );

      return {
        api,
        Component: () => {
          const [chartWidth, setChartWidth] = useState<number>(0);
          const [zoom, setZoom] = useState<AppStateZoom | undefined>();
          const [selectedForecastId, setSelectedForecastId] = useState<string | undefined>();
          const [selectedJob, setSelectedJob] = useState<MlJob | undefined>();
          const [jobsLoaded, setJobsLoaded] = useState(false);

          const isMounted = useRef(true);

          const {
            mlApiServices,
            mlJobService,
            mlTimeSeriesExplorerService,
            toastNotificationService,
          } = services[2];
          const startServices = pick(services[0], 'analytics', 'i18n', 'theme');
          const datePickerDeps: DatePickerDependencies = {
            ...pick(services[0], ['http', 'notifications', 'theme', 'uiSettings', 'i18n']),
            data: services[1].data,
            uiSettingsKeys: UI_SETTINGS,
            showFrozenDataTierChoice: false,
          };

          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const { singleMetricViewerData, bounds, lastRefresh } =
            useStateFromPublishingSubject(singleMetricViewerData$);

          useReactEmbeddableExecutionContext(
            services[0].executionContext,
            parentApi.executionContext,
            ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
            uuid
          );

          useUnmount(() => {
            onSingleMetricViewerDestroy();
            onDestroy();
            subscriptions.unsubscribe();
          });

          const selectedJobId = singleMetricViewerData?.jobIds[0];
          // Need to make sure we fall back to `undefined` if `functionDescription` is an empty string,
          // otherwise anomaly table data will not be loaded.
          const functionDescription =
            (singleMetricViewerData?.functionDescription ?? '') === ''
              ? undefined
              : singleMetricViewerData?.functionDescription;
          const previousRefresh = usePrevious(lastRefresh ?? 0);

          useEffect(function setUpJobsLoaded() {
            async function loadJobs() {
              try {
                await mlJobService.loadJobsWrapper();
                setJobsLoaded(true);
              } catch (e) {
                blockingError.next(new Error(errorMessage));
              }
            }
            if (isMounted.current === false) {
              return;
            }
            loadJobs();

            return () => {
              isMounted.current = false;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
          }, []);

          useEffect(
            function setUpSelectedJob() {
              async function fetchSelectedJob() {
                if (mlApiServices && selectedJobId !== undefined) {
                  try {
                    const { jobs } = await mlApiServices.getJobs({ jobId: selectedJobId });
                    const job = jobs[0];
                    setSelectedJob(job);
                  } catch (e) {
                    blockingError.next(new Error(errorMessage));
                  }
                }
              }
              if (isMounted.current === false) {
                return;
              }
              fetchSelectedJob();
            },
            [selectedJobId, mlApiServices]
          );

          const autoZoomDuration = useMemo(() => {
            if (!selectedJob) return;
            return mlTimeSeriesExplorerService?.getAutoZoomDuration(selectedJob);
          }, [mlTimeSeriesExplorerService, selectedJob]);

          // eslint-disable-next-line react-hooks/exhaustive-deps
          const resizeHandler = useCallback(
            throttle((e: { width: number; height: number }) => {
              if (Math.abs(chartWidth - e.width) > minElemAndChartDiff) {
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

            [setZoom, setSelectedForecastId]
          );

          return (
            <KibanaRenderContextProvider {...startServices}>
              <KibanaContextProvider
                services={{
                  mlServices: {
                    ...services[2],
                  },
                  ...services[0],
                  ...services[1],
                }}
              >
                <DatePickerContextProvider {...datePickerDeps}>
                  <EuiResizeObserver onResize={resizeHandler}>
                    {(resizeRef) => (
                      <div
                        id={`mlSingleMetricViewerEmbeddableWrapper-${api.uuid}`}
                        style={{
                          width: '100%',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          padding: '8px',
                        }}
                        data-test-subj={`mlSingleMetricViewer_${api.uuid}`}
                        ref={resizeRef}
                        className="ml-time-series-explorer"
                      >
                        {singleMetricViewerData !== undefined &&
                          autoZoomDuration !== undefined &&
                          jobsLoaded &&
                          selectedJobId === selectedJob?.job_id && (
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
                              selectedDetectorIndex={singleMetricViewerData.selectedDetectorIndex}
                              selectedEntities={singleMetricViewerData.selectedEntities}
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
                </DatePickerContextProvider>
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };

  return factory;
};
