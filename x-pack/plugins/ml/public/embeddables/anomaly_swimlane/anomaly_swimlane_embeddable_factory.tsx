/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import fastIsEqual from 'fast-deep-equal';
import type { StartServicesAccessor } from '@kbn/core/public';

import type {
  EmbeddableFactoryDefinition,
  IContainer,
  ReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import React, { Suspense, useEffect } from 'react';
import { BehaviorSubject, Subscription } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import { initializeTimeRange, initializeTitles } from '@kbn/presentation-publishing';
import type {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableServices,
  AnomalySwimlaneEmbeddableUserInput,
} from '..';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '..';
import { ML_APP_NAME, PLUGIN_ICON, PLUGIN_ID } from '../../../common/constants/app';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { IAnomalySwimlaneEmbeddable } from './anomaly_swimlane_embeddable';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';
import EmbeddableSwimLaneContainer from './embeddable_swim_lane_container';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import { SWIM_LANE_DEFAULT_PAGE_SIZE } from '../../application/explorer/explorer_constants';
import type { JobId } from '../../shared';
import { buildDataViewPublishingApi } from '../common/anomaly_detection_embeddable';

/**
 * Provides the services required by the Anomaly Swimlane Embeddable.
 */
export const getServices = async (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
): Promise<AnomalySwimlaneEmbeddableServices> => {
  const [coreStart, pluginsStart] = await getStartServices();

  const { AnomalyDetectorService } = await import(
    '../../application/services/anomaly_detector_service'
  );
  const { AnomalyTimelineService } = await import(
    '../../application/services/anomaly_timeline_service'
  );
  const { mlApiServicesProvider } = await import('../../application/services/ml_api_service');
  const { mlResultsServiceProvider } = await import('../../application/services/results_service');

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

      const jobIds = new BehaviorSubject<JobId[]>(state.jobIds);
      const swimlaneType = new BehaviorSubject<SwimlaneType>(state.swimlaneType);
      const viewBy = new BehaviorSubject<string | undefined>(state.viewBy);
      const fromPage = new BehaviorSubject<number>(1);
      const perPage = new BehaviorSubject<number>(state.perPage ?? SWIM_LANE_DEFAULT_PAGE_SIZE);
      const interval = new BehaviorSubject<number | undefined>(undefined);

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const timeRange$ = new BehaviorSubject<TimeRange | undefined>(state.timeRange);
      function setTimeRange(nextTimeRange: TimeRange | undefined) {
        timeRange$.next(nextTimeRange);
      }

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

      const { appliedTimeRange$ } = initializeTimeRange(state, parentApi);

      const api = buildApi(
        {
          ...titlesApi,
          appliedTimeRange$,
          jobIds,
          swimlaneType,
          viewBy,
          fromPage,
          perPage,
          interval,
          setInterval: (v) => interval.next(v),
          updateUserInput: (update: AnomalySwimlaneEmbeddableUserInput) => {
            jobIds.next(update.jobIds);
            swimlaneType.next(update.swimlaneType);
            viewBy.next(update.viewBy);
            titlesApi.setPanelTitle(update.panelTitle);
          },
          updatePagination: (update: { perPage?: number; fromPage: number }) => {
            fromPage.next(update.fromPage);
            if (update.perPage) {
              perPage.next(update.perPage);
            }
          },
          dataViews: buildDataViewPublishingApi(
            {
              anomalyDetectorService: services[2].anomalyDetectorService,
              dataViewsService: services[1].data.dataViews,
            },
            { jobIds },
            subscriptions
          ),
          timeRange$,
          setTimeRange,
          dataLoading: dataLoading$,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                jobIds: jobIds.value,
                swimlaneType: swimlaneType.value,
                viewBy: viewBy.value,
                perPage: perPage.value,
                timeRange: timeRange$.value,
              },

              references: [],
            };
          },
        },
        {
          timeRange: [timeRange$, setTimeRange, fastIsEqual],
          ...titleComparators,
          jobIds: [jobIds, jobIds.next, fastIsEqual],
          swimlaneType: [swimlaneType, swimlaneType.next],
          viewBy: [viewBy, viewBy.next],
          // We do not want to store the current page
          fromPage: [fromPage, fromPage.next, () => true],
          perPage: [perPage, perPage.next],
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

export class AnomalySwimlaneEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalySwimlaneEmbeddableInput>
{
  public readonly type = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  public readonly grouping = [
    {
      id: PLUGIN_ID,
      getDisplayName: () => ML_APP_NAME,
      getIconType: () => PLUGIN_ICON,
    },
  ];

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
      defaultMessage: 'Anomaly swim lane',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.description', {
      defaultMessage: 'View anomaly detection results in a timeline.',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
    const [coreStart, deps] = await this.getServices();

    try {
      const { resolveAnomalySwimlaneUserInput } = await import('./anomaly_swimlane_setup_flyout');
      const userInput = await resolveAnomalySwimlaneUserInput(coreStart, deps.data.dataViews);

      return {
        ...userInput,
        title: userInput.panelTitle,
      };
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<AnomalySwimlaneEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();

    const { AnomalyDetectorService } = await import(
      '../../application/services/anomaly_detector_service'
    );
    const { AnomalyTimelineService } = await import(
      '../../application/services/anomaly_timeline_service'
    );
    const { mlApiServicesProvider } = await import('../../application/services/ml_api_service');
    const { mlResultsServiceProvider } = await import('../../application/services/results_service');

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
  }

  public async create(
    initialInput: AnomalySwimlaneEmbeddableInput,
    parent?: IContainer
  ): Promise<InstanceType<IAnomalySwimlaneEmbeddable>> {
    const services = await this.getServices();
    const { AnomalySwimlaneEmbeddable } = await import('./anomaly_swimlane_embeddable');
    return new AnomalySwimlaneEmbeddable(initialInput, services, parent);
  }
}
