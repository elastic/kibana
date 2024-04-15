/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { pick } from 'lodash';

import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { EuiResizeObserver } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useUnmount from 'react-use/lib/useUnmount';
import moment from 'moment';
import {
  initializeTimeRange,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import usePrevious from 'react-use/lib/usePrevious';
import { throttle } from 'lodash';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import type { SingleMetricViewerEmbeddableApi, SingleMetricViewerEmbeddableState } from '../types';
import { initializeSingleMetricViewerControls } from './single_metric_viewer_controls_initializer';
import { initializeSingleMetricViewerDataFetcher } from './single_metric_viewer_data_fetcher';
import { TimeSeriesExplorerEmbeddableChart } from '../../application/timeseriesexplorer/timeseriesexplorer_embeddable_chart';
import { APP_STATE_ACTION } from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
import { getServices } from './get_services';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import './_index.scss';

const RESIZE_THROTTLE_TIME_MS = 500;
const containerPadding = 10;
interface AppStateZoom {
  from?: string;
  to?: string;
}

export const getSingleMetricViewerEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    SingleMetricViewerEmbeddableState,
    SingleMetricViewerEmbeddableApi
  > = {
    type: ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      return state.rawState as SingleMetricViewerEmbeddableState;
    },
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

      const refresh$ = new BehaviorSubject<void>(undefined);

      const api = buildApi(
        {
          ...titlesApi,
          ...timeRangeApi,
          ...singleMetricViewerControlsApi,
          dataLoading,
          serializeState: () => {
            return {
              rawState: {
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
        refresh$,
        services[1].data.query.timefilter.timefilter
      );

      return {
        api,
        Component: () => {
          const [chartWidth, setChartWidth] = useState<number>(0);
          const [zoom, setZoom] = useState<AppStateZoom | undefined>();
          const [selectedForecastId, setSelectedForecastId] = useState<string | undefined>();
          const [selectedJob, setSelectedJob] = useState<MlJob | undefined>();
          const [autoZoomDuration, setAutoZoomDuration] = useState<number | undefined>();
          const [jobsLoaded, setJobsLoaded] = useState(false);
          const [error, setError] = useState<string | undefined>();

          const {
            mlApiServices,
            mlJobService,
            mlTimeSeriesExplorerService,
            toastNotificationService,
          } = services[2];
          const I18nContext = services[0].i18n.Context;
          const theme = services[0].theme;
          const datePickerDeps: DatePickerDependencies = {
            ...pick(services[0], ['http', 'notifications', 'theme', 'uiSettings', 'i18n']),
            data: services[1].data,
            uiSettingsKeys: UI_SETTINGS,
            showFrozenDataTierChoice: false,
          };

          const data = useStateFromPublishingSubject(singleMetricViewerData$);
          const [singleMetricViewerData, bounds, lastRefresh] = data;

          useUnmount(() => {
            onSingleMetricViewerDestroy();
            onDestroy();
            subscriptions.unsubscribe();
          });

          useReactEmbeddableExecutionContext(
            services[0].executionContext,
            // TODO https://github.com/elastic/kibana/issues/180055
            // @ts-ignore
            parentApi?.executionContext?.value ?? { name: 'dashboard' },
            ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
            uuid
          );

          const selectedJobId = singleMetricViewerData?.jobIds[0];
          // Need to make sure we fall back to `undefined` if `functionDescription` is an empty string,
          // otherwise anomaly table data will not be loaded.
          const functionDescription =
            (singleMetricViewerData?.functionDescription ?? '') === ''
              ? undefined
              : singleMetricViewerData.functionDescription;
          const previousRefresh = usePrevious(lastRefresh ?? 0);

          // Holds the container height for previously fetched data
          const containerHeightRef = useRef<number>();

          useEffect(function setUpJobsLoaded() {
            async function loadJobs() {
              try {
                await mlJobService.loadJobsWrapper();
                setJobsLoaded(true);
              } catch (e) {
                const errorMessage = extractErrorMessage(e);
                setError(errorMessage);
              }
            }
            loadJobs();
            // eslint-disable-next-line react-hooks/exhaustive-deps
          }, []);

          useEffect(
            function setUpSelectedJob() {
              async function fetchSelectedJob() {
                if (mlApiServices && selectedJobId !== undefined && error === undefined) {
                  try {
                    const { jobs } = await mlApiServices.getJobs({ jobId: selectedJobId });
                    const job = jobs[0];
                    setSelectedJob(job);
                  } catch (e) {
                    const errorMessage = extractErrorMessage(e);
                    setError(errorMessage);
                  }
                }
              }
              fetchSelectedJob();
            },
            [selectedJobId, mlApiServices, error]
          );

          useEffect(
            function setUpAutoZoom() {
              let zoomDuration: number | undefined;
              if (selectedJobId !== undefined && selectedJob !== undefined) {
                zoomDuration = mlTimeSeriesExplorerService?.getAutoZoomDuration(selectedJob);
                setAutoZoomDuration(zoomDuration);
              }
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [selectedJobId, selectedJob?.job_id, mlTimeSeriesExplorerService]
          );

          useEffect(function onUnmount() {
            return () => {
              subscriptions.unsubscribe();
            };
          }, []);

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

          if (error) {
            return (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ml.singleMetricViewerEmbeddable.errorMessage"
                    defaultMessage="Unable to load the ML single metric viewer data"
                  />
                }
                color="danger"
                iconType="warning"
                css={{ width: '100%' }}
              >
                <p>{error}</p>
              </EuiCallOut>
            );
          }

          return (
            <I18nContext>
              <KibanaThemeProvider theme={theme}>
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
                    <Suspense fallback={<EmbeddableLoading />}>
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
                              jobsLoaded && (
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
                                  selectedDetectorIndex={
                                    singleMetricViewerData.selectedDetectorIndex
                                  }
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
                    </Suspense>
                  </DatePickerContextProvider>
                </KibanaContextProvider>
              </KibanaThemeProvider>
            </I18nContext>
          );
        },
      };
    },
  };

  return factory;
};
