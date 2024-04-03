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
import {
  apiHasParentApi,
  apiPublishesTimeRange,
  initializeTimeRange,
  initializeTitles,
} from '@kbn/presentation-publishing';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import React, { Suspense, useEffect } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, map, of, Subscription } from 'rxjs';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { EmbeddableSingleMetricViewerContainer } from './embeddable_single_metric_viewer_container_lazy';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import type {
  SingleMetricViewerEmbeddableServices,
  SingleMetricViewerEmbeddableApi,
  SingleMetricViewerEmbeddableState,
} from '../types';
import { initializeSingleMetricViewerControls } from './single_metric_viewer_controls_initializer';

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
  const mlJobService = mlJobServiceFactory(
    toastNotificationServiceProvider(coreStart.notifications.toasts),
    mlApiServices
  );
  const mlResultsService = mlResultsServiceProvider(mlApiServices);
  const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(mlResultsService, mlApiServices);
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
      } = initializeSingleMetricViewerControls(state, titlesApi);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
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
          dataLoading: dataLoading$,
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

      const onError = () => {
        dataLoading$.next(false);
      };

      const onLoading = () => {
        dataLoading$.next(true);
      };

      const onRenderComplete = () => {};

      return {
        api,
        Component: () => {
          const I18nContext = services[0].i18n.Context;
          const theme = services[0].theme;
          const datePickerDeps: DatePickerDependencies = {
            ...pick(services[0], ['http', 'notifications', 'theme', 'uiSettings', 'i18n']),
            data: services[1].data,
            uiSettingsKeys: UI_SETTINGS,
            showFrozenDataTierChoice: false,
          };

          useEffect(function onUnmount() {
            return () => {
              subscriptions.unsubscribe();
            };
          }, []);

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
                      <EmbeddableSingleMetricViewerContainer
                        api={api}
                        id={api.uuid}
                        services={services}
                        refresh={refresh$}
                        onRenderComplete={onRenderComplete}
                        onLoading={onLoading}
                        onError={onError}
                      />
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
