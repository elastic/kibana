/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import type { StartServicesAccessor } from '@kbn/core/public';

import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { PLUGIN_ICON, PLUGIN_ID, ML_APP_NAME } from '../../../common/constants/app';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import type { AnomalyChartsEmbeddableInput, AnomalyChartsEmbeddableServices } from '..';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '..';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';

interface AnomalyChartsReactEmbeddableState {}
interface AnomalyChartsReactEmbeddableApi {}
interface AnomalySwimlaneRuntimeState {}

export const getAnomalyChartsReactEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    AnomalyChartsReactEmbeddableState,
    AnomalyChartsReactEmbeddableApi,
    AnomalySwimlaneRuntimeState
  > = {
    type: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      if (!apiHasExecutionContext(parentApi)) {
        throw new Error('Parent API does not have execution context');
      }

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

      // const {
      //   swimLaneControlsApi,
      //   serializeSwimLaneState,
      //   swimLaneComparators,
      //   onSwimLaneDestroy,
      // } = initializeSwimLaneControls(state, titlesApi);

      // Helpers for swim lane data fetching
      const chartWidth$ = new BehaviorSubject<number | undefined>(undefined);

      const api = buildApi(
        {
          isEditingEnabled: () => true,
          getTypeDisplayName: () =>
            i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.typeDisplayName', {
              defaultMessage: 'anomaly charts',
            }),
          onEdit: async () => {
            try {
              const { resolveEmbeddableAnomalyChartsUserInput } = await import(
                './anomaly_charts_setup_flyout'
              );
              const result = await resolveEmbeddableAnomalyChartsUserInput(
                { ...coreStartServices, ...pluginsStartServices },
                deps.data.dataViews
              );

              const result = await resolveAnomalySwimlaneUserInput(
                { ...coreStartServices, ...pluginsStartServices },
                {
                  ...serializeTitles(),
                  // ...serializeSwimLaneState(),
                }
              );

              // swimLaneControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          ...titlesApi,
          ...timeRangeApi,
          // ...swimLaneControlsApi,
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
                timeRange: undefined,
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
          const { uiSettings } = coreStartServices;
          const { uiActions } = pluginsStartServices;

          const timeBuckets = useTimeBuckets(uiSettings);

          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          useReactEmbeddableExecutionContext(
            services[0].executionContext,
            parentApi.executionContext,
            ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
            uuid
          );

          useUnmount(() => {
            onSwimLaneDestroy();
            onDestroy();
            subscriptions.unsubscribe();
          });
          return null;
        },
      };
    },
  };
  return factory;
};

// @TODO: REMOVE
export class AnomalyChartsEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalyChartsEmbeddableInput>
{
  public readonly type = ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;

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
    return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.displayName', {
      defaultMessage: 'Anomaly chart',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.description', {
      defaultMessage: 'View anomaly detection results in a chart.',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalyChartsEmbeddableInput>> {
    const [coreStart, deps] = await this.getServices();

    try {
      const { resolveEmbeddableAnomalyChartsUserInput } = await import(
        './anomaly_charts_setup_flyout'
      );
      return await resolveEmbeddableAnomalyChartsUserInput(coreStart, deps.data.dataViews);
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<AnomalyChartsEmbeddableServices> {
    const [
      [coreStart, pluginsStart],
      { AnomalyDetectorService },
      { fieldFormatServiceFactory },
      { indexServiceFactory },
      { mlApiServicesProvider },
      { mlResultsServiceProvider },
    ] = await Promise.all([
      await this.getStartServices(),
      await import('../../application/services/anomaly_detector_service'),
      await import('../../application/services/field_format_service_factory'),
      await import('../../application/util/index_service'),
      await import('../../application/services/ml_api_service'),
      await import('../../application/services/results_service'),
    ]);

    const httpService = new HttpService(coreStart.http);
    const anomalyDetectorService = new AnomalyDetectorService(httpService);
    const mlApiServices = mlApiServicesProvider(httpService);
    const mlResultsService = mlResultsServiceProvider(mlApiServices);
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
        mlFieldFormatService,
        mlResultsService,
      },
    ];
  }

  public async create(initialInput: AnomalyChartsEmbeddableInput, parent?: IContainer) {
    const services = await this.getServices();
    const { AnomalyChartsEmbeddable } = await import('./anomaly_charts_embeddable');
    return new AnomalyChartsEmbeddable(initialInput, services, parent);
  }
}
