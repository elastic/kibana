/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';
import { css } from '@emotion/react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import {
  apiHasParentApi,
  apiPublishesTimeRange,
  initializeTimeRange,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import React, { useCallback, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, map, of, Subscription } from 'rxjs';
import type { AnomalySwimlaneEmbeddableServices } from '..';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '..';
import type { MlDependencies } from '../../application/app';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import { Y_AXIS_LABEL_WIDTH } from '../../application/explorer/swimlane_annotation_container';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import { buildDataViewPublishingApi } from '../common/anomaly_detection_embeddable';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { initializeSwimLaneControls } from './initialize_swim_lane_controls';
import { initializeSwimLaneDataFetcher } from './initialize_swim_lane_data_fetcher';
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

      const [coreStartServices, pluginsStartServices, anomalySwimLaneServices] = services;

      const subscriptions = new Subscription();

      const interval = new BehaviorSubject<number | undefined>(undefined);

      const dataLoading = new BehaviorSubject<boolean | undefined>(true);
      const blockingError = new BehaviorSubject<Error | undefined>(undefined);
      const query$ =
        // @ts-ignore
        (state.query ? new BehaviorSubject(state.query) : parentApi?.query$) ??
        new BehaviorSubject(undefined);
      const filters$ =
        // @ts-ignore
        (state.query ? new BehaviorSubject(state.filters) : parentApi?.filters$) ??
        new BehaviorSubject(undefined);

      const refresh$ = new BehaviorSubject<void>(undefined);

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const {
        api: timeRangeApi,
        comparators: timeRangeComparators,
        serialize: serializeTimeRange,
      } = initializeTimeRange(state);

      const {
        swimLaneControlsApi,
        serializeSwimLaneState,
        swimLaneComparators,
        onSwimLaneDestroy,
      } = initializeSwimLaneControls(state, titlesApi);

      // Helpers for swim lane data fetching
      const chartWidth$ = new BehaviorSubject<number | undefined>(undefined);

      const api = buildApi(
        {
          ...titlesApi,
          ...timeRangeApi,
          ...swimLaneControlsApi,
          query$,
          filters$,
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
          dataLoading,
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

      const { swimLaneData$, onDestroy } = initializeSwimLaneDataFetcher(
        api,
        chartWidth$.asObservable(),
        dataLoading,
        blockingError,
        appliedTimeRange$,
        query$,
        filters$,
        refresh$,
        anomalySwimLaneServices
      );

      const onRenderComplete = () => {};

      return {
        api,
        Component: () => {
          const { theme, i18n, uiSettings } = coreStartServices;
          const { uiActions } = pluginsStartServices;

          const I18nContext = i18n.Context;
          const timeBuckets = useTimeBuckets(uiSettings);

          useReactEmbeddableExecutionContext(
            services[0].executionContext,
            // TODO https://github.com/elastic/kibana/issues/180055
            // @ts-ignore
            parentApi?.executionContext?.value ?? { name: 'dashboard' },
            ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
            uuid
          );

          useUnmount(() => {
            onSwimLaneDestroy();
            onDestroy();
            subscriptions.unsubscribe();
          });

          const [fromPage, perPage, swimlaneType, swimlaneData, error] =
            useBatchedPublishingSubjects(
              api.fromPage,
              api.perPage,
              api.swimlaneType,
              swimLaneData$,
              api.blockingError
            );

          const [selectedCells, setSelectedCells] = useState<AppStateSelectedCells | undefined>();

          const onCellsSelection = useCallback(
            (update?: AppStateSelectedCells) => {
              setSelectedCells(update);

              if (update) {
                uiActions.getTrigger(SWIM_LANE_SELECTION_TRIGGER).exec({
                  embeddable: api,
                  data: update,
                  updateCallback: setSelectedCells.bind(null, undefined),
                });
              }
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [swimlaneData, perPage, setSelectedCells]
          );

          if (error) {
            return (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ml.swimlaneEmbeddable.errorMessage"
                    defaultMessage="Unable to load the ML swim lane data"
                  />
                }
                color="danger"
                iconType="warning"
                css={{ width: '100%' }}
              >
                <p>{error.message}</p>
              </EuiCallOut>
            );
          }

          return (
            <I18nContext>
              <KibanaThemeProvider theme={theme}>
                <KibanaContextProvider services={{ ...coreStartServices }}>
                  <div
                    css={css`
                      width: 100%;
                      padding: 8px;
                    `}
                    data-test-subj="mlAnomalySwimlaneEmbeddableWrapper"
                  >
                    <SwimlaneContainer
                      id={uuid}
                      data-test-subj={`mlSwimLaneEmbeddable_${uuid}`}
                      timeBuckets={timeBuckets}
                      swimlaneData={swimlaneData!}
                      swimlaneType={swimlaneType}
                      fromPage={fromPage}
                      perPage={perPage}
                      swimlaneLimit={
                        isViewBySwimLaneData(swimlaneData) ? swimlaneData.cardinality : undefined
                      }
                      onResize={(size) => chartWidth$.next(size)}
                      selection={selectedCells}
                      onCellsSelection={onCellsSelection}
                      onPaginationChange={(update) => {
                        if (update.fromPage) {
                          api.updatePagination({ fromPage: update.fromPage });
                        }
                        if (update.perPage) {
                          api.updatePagination({ perPage: update.perPage, fromPage: 1 });
                        }
                      }}
                      isLoading={dataLoading.value!}
                      yAxisWidth={{ max: Y_AXIS_LABEL_WIDTH }}
                      noDataWarning={
                        <EuiEmptyPrompt
                          titleSize="xxs"
                          css={{ padding: 0 }}
                          title={
                            <h2>
                              <FormattedMessage
                                id="xpack.ml.swimlaneEmbeddable.noDataFound"
                                defaultMessage="No anomalies found"
                              />
                            </h2>
                          }
                        />
                      }
                      chartsService={pluginsStartServices.charts}
                      onRenderComplete={onRenderComplete}
                    />
                  </div>
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
