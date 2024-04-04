/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTimeRange, initializeTitles } from '@kbn/presentation-publishing';
import React, { Suspense, useEffect } from 'react';
import { BehaviorSubject, Subscription } from 'rxjs';
import type { AnomalySwimlaneEmbeddableServices } from '..';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '..';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { buildDataViewPublishingApi } from '../common/anomaly_detection_embeddable';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import EmbeddableSwimLaneContainer from './embeddable_swim_lane_container';
import { initializeSwimLaneControls } from './initialize_swim_lane_controls';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';

/**
 * Provides the services required by the Anomaly Swimlane Embeddable.
 */
export const getServices = async (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
): Promise<AnomalySwimlaneEmbeddableServices> => {
  const [
    [coreStart, pluginsStart],
    { AnomalyDetectorService },
    { AnomalyTimelineService },
    { mlApiServicesProvider },
    { mlResultsServiceProvider },
  ] = await Promise.all([
    getStartServices(),
    import('../../application/services/anomaly_detector_service'),
    import('../../application/services/anomaly_timeline_service'),
    import('../../application/services/ml_api_service'),
    import('../../application/services/results_service'),
  ]);

  const httpService = new HttpService(coreStart.http);
  const anomalyDetectorService = new AnomalyDetectorService(httpService);
  const anomalyTimelineService = new AnomalyTimelineService(
    pluginsStart.data.query.timefilter.timefilter,
    coreStart.uiSettings,
    mlResultsServiceProvider(mlApiServicesProvider(httpService))
  );

  return [
    coreStart,
    pluginsStart as MlDependencies,
    { anomalyDetectorService, anomalyTimelineService },
  ];
};

export const getAnomalySwimLaneEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    AnomalySwimLaneEmbeddableState,
    AnomalySwimLaneEmbeddableApi
  > = {
    type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      return state.rawState as AnomalySwimLaneEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const services = await getServices(getStartServices);
      const subscriptions = new Subscription();

      const interval = new BehaviorSubject<number | undefined>(undefined);

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const { appliedTimeRange$, serializeTimeRange, timeRangeComparators, timeRangeApi } =
        initializeTimeRange(state, parentApi);

      const { swimLaneControlsApi, serializeSwimLaneState, swimLaneComparators } =
        initializeSwimLaneControls(state, titlesApi);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

      const query$ =
        // @ts-ignore
        (state.query ? new BehaviorSubject(state.query) : parentApi?.query$) ??
        new BehaviorSubject(undefined);
      const filters$ =
        // @ts-ignore

        (state.query ? new BehaviorSubject(state.filters) : parentApi?.filters$) ??
        new BehaviorSubject(undefined);

      const api = buildApi(
        {
          ...titlesApi,
          ...timeRangeApi,
          query$,
          filters$,
          // @ts-ignore
          appliedTimeRange$,
          ...swimLaneControlsApi,
          interval,
          setInterval: (v) => interval.next(v),
          dataViews: buildDataViewPublishingApi(
            {
              anomalyDetectorService: services[2].anomalyDetectorService,
              dataViewsService: services[1].data.dataViews,
            },
            { jobIds: swimLaneControlsApi.jobIds },
            subscriptions
          ),
          dataLoading: dataLoading$,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                ...serializeTimeRange(),
                ...serializeSwimLaneState(),
              },
              references: [],
            };
          },
        },
        {
          ...timeRangeComparators,
          ...titleComparators,
          ...swimLaneComparators,
        }
      );

      const onError = () => {
        dataLoading$.next(false);
      };

      const onLoading = () => {
        dataLoading$.next(true);
      };

      const refresh$ = new BehaviorSubject<void>(undefined);

      const onRenderComplete = () => {};

      return {
        api,
        Component: () => {
          const I18nContext = services[0].i18n.Context;
          const theme = services[0].theme;

          useEffect(function onUnmount() {
            return () => {
              subscriptions.unsubscribe();
            };
          }, []);

          return (
            <I18nContext>
              <KibanaThemeProvider theme={theme}>
                <KibanaContextProvider services={{ ...services[0] }}>
                  <Suspense fallback={<EmbeddableLoading />}>
                    <EmbeddableSwimLaneContainer
                      api={api}
                      id={api.uuid}
                      services={services}
                      refresh={refresh$}
                      onRenderComplete={onRenderComplete}
                      onLoading={onLoading}
                      onError={onError}
                    />
                  </Suspense>
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
