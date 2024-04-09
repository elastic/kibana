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
import type { TimeRange } from '@kbn/es-query';
import { EuiResizeObserver } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import moment from 'moment';
import {
  apiHasParentApi,
  apiPublishesTimeRange,
  initializeTimeRange,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import usePrevious from 'react-use/lib/usePrevious';
import type { Observable } from 'rxjs';
import { throttle } from 'lodash';
import { BehaviorSubject, combineLatest, map, of, Subscription } from 'rxjs';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import type {
  SingleMetricViewerEmbeddableServices,
  SingleMetricViewerEmbeddableApi,
  SingleMetricViewerEmbeddableState,
} from '../types';
import { initializeSingleMetricViewerControls } from './single_metric_viewer_controls_initializer';
import { initializeSingleMetricViewerDataFetcher } from './single_metric_viewer_data_fetcher';
import { TimeSeriesExplorerEmbeddableChart } from '../../application/timeseriesexplorer/timeseriesexplorer_embeddable_chart';
import { APP_STATE_ACTION } from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
import './_index.scss';

const RESIZE_THROTTLE_TIME_MS = 500;
const containerPadding = 10;
interface AppStateZoom {
  from?: string;
  to?: string;
}

/**
 * Provides the services required by the Anomaly Swimlane Embeddable.
 */
export const getServices = async (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
): Promise<SingleMetricViewerEmbeddableServices> => {
  const [
    [coreStart, pluginsStart],
    { AnomalyDetectorService },
    { fieldFormatServiceFactory },
    { indexServiceFactory },
    { timeSeriesExplorerServiceFactory },
    { mlApiServicesProvider },
    { mlJobServiceFactory },
    { mlResultsServiceProvider },
    { MlCapabilitiesService },
    { timeSeriesSearchServiceFactory },
    { toastNotificationServiceProvider },
  ] = await Promise.all([
    await getStartServices(),
    await import('../../application/services/anomaly_detector_service'),
    await import('../../application/services/field_format_service_factory'),
    await import('../../application/util/index_service'),
    await import('../../application/util/time_series_explorer_service'),
    await import('../../application/services/ml_api_service'),
    await import('../../application/services/job_service'),
    await import('../../application/services/results_service'),
    await import('../../application/capabilities/check_capabilities'),
    await import(
      '../../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service'
    ),
    await import('../../application/services/toast_notification_service'),
  ]);

  const httpService = new HttpService(coreStart.http);
  const anomalyDetectorService = new AnomalyDetectorService(httpService);
  const mlApiServices = mlApiServicesProvider(httpService);
  const toastNotificationService = toastNotificationServiceProvider(coreStart.notifications.toasts);
  const mlJobService = mlJobServiceFactory(toastNotificationService, mlApiServices);
  const mlResultsService = mlResultsServiceProvider(mlApiServices);
  const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(mlResultsService, mlApiServices);
  const mlTimeSeriesExplorerService = timeSeriesExplorerServiceFactory(
    coreStart.uiSettings,
    mlApiServices,
    mlResultsService
  );
  const mlCapabilities = new MlCapabilitiesService(mlApiServices);
  const anomalyExplorerService = new AnomalyExplorerChartsService(
    pluginsStart.data.query.timefilter.timefilter,
    mlApiServices,
    mlResultsService
  );

  // Note on the following services:
  // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
  //   but it's not being made available as part of global services. Since it's just
  //   some stateless utils `useMlIndexUtils()` should be used from within components.
  // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
  //   so because of its own state it needs to be made available as a global service.
  //   In the long run we should again try to get rid of it here and make it available via
  //   its own context or possibly without having a singleton like state at all, since the
  //   way this manages its own state right now doesn't consider React component lifecycles.
  const mlIndexUtils = indexServiceFactory(pluginsStart.data.dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

  return [
    coreStart,
    pluginsStart as MlDependencies,
    {
      anomalyDetectorService,
      anomalyExplorerService,
      mlApiServices,
      mlCapabilities,
      mlFieldFormatService,
      mlJobService,
      mlResultsService,
      mlTimeSeriesSearchService,
      mlTimeSeriesExplorerService,
      toastNotificationService,
    },
  ];
};

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
      const query$ =
        // @ts-ignore property does not exist on type 'PresentationContainer'
        (state.query ? new BehaviorSubject(state.query) : parentApi?.query$) ??
        new BehaviorSubject(undefined);
      const filters$ =
        // @ts-ignore property does not exist on type 'PresentationContainer'
        (state.query ? new BehaviorSubject(state.filters) : parentApi?.filters$) ??
        new BehaviorSubject(undefined);

      const refresh$ = new BehaviorSubject<void>(undefined);

      const api = buildApi(
        {
          ...titlesApi,
          ...timeRangeApi,
          ...singleMetricViewerControlsApi,
          query$,
          filters$,
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

      const appliedTimeRange$: Observable<TimeRange | undefined> = combineLatest([
        api.timeRange$,
        apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)
          ? api.parentApi.timeRange$
          : of(null),
        apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)
          ? api.parentApi.timeslice$
          : of(null),
      ]).pipe(
        // @ts-ignore
        map(([timeRange, parentTimeRange, parentTimeslice]) => {
          if (timeRange) {
            return timeRange;
          }
          if (parentTimeRange) {
            return parentTimeRange;
          }
          if (parentTimeslice) {
            return parentTimeRange;
          }
          return undefined;
        })
      ) as Observable<TimeRange | undefined>;

      const { singleMetricViewerData$, onDestroy } = initializeSingleMetricViewerDataFetcher(
        api,
        dataLoading,
        blockingError,
        appliedTimeRange$,
        query$,
        filters$,
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

          const [singleMetricViewerData, , , , , bounds, lastRefresh] =
            useStateFromPublishingSubject(singleMetricViewerData$);

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
              : singleMetricViewerData.functionDescription;
          const previousRefresh = usePrevious(lastRefresh ?? 0);

          // Holds the container height for previously fetched data
          const containerHeightRef = useRef<number>();

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
