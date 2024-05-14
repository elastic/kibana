/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { useMemo } from 'react';
import type { StartServicesAccessor } from '@kbn/core/public';
import { Subscription, BehaviorSubject, combineLatest, map, skipWhile } from 'rxjs';
import { apiHasParentApi, apiPublishesTimeRange, fetch$ } from '@kbn/presentation-publishing';
import useUnmount from 'react-use/lib/useUnmount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  apiHasExecutionContext,
  initializeTimeRange,
  initializeTitles,
} from '@kbn/presentation-publishing';
import { dynamic } from '@kbn/shared-ux-utility';
import useObservable from 'react-use/lib/useObservable';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import type { AnomalyChartsEmbeddableServices } from '..';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  ANOMALY_EXPLORER_CHARTS_REACT_EMBEDDABLE_TYPE,
} from '..';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { initializeAnomalyChartsControls } from './initialize_anomaly_charts_controls';
import type { AnomalyChartsEmbeddableApi, AnomalyChartsEmbeddableState } from './types';

const EmbeddableAnomalyChartsContainer = dynamic(() => import('./anomaly_charts_react_container'));

export const getAnomalyChartsReactEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<AnomalyChartsEmbeddableState, AnomalyChartsEmbeddableApi> =
    {
      type: ANOMALY_EXPLORER_CHARTS_REACT_EMBEDDABLE_TYPE,
      deserializeState: (state) => state.rawState,
      buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
        if (!apiHasExecutionContext(parentApi)) {
          throw new Error('Parent API does not have execution context');
        }

        const [
          [coreStartServices, pluginsStartServices],
          { AnomalyDetectorService },
          { fieldFormatServiceFactory },
          { indexServiceFactory },
          { mlApiServicesProvider },
          { mlResultsServiceProvider },
        ] = await Promise.all([
          await getStartServices(),
          await import('../../application/services/anomaly_detector_service'),
          await import('../../application/services/field_format_service_factory'),
          await import('../../application/util/index_service'),
          await import('../../application/services/ml_api_service'),
          await import('../../application/services/results_service'),
        ]);
        const httpService = new HttpService(coreStartServices.http);
        const anomalyDetectorService = new AnomalyDetectorService(httpService);
        const mlApiServices = mlApiServicesProvider(httpService);
        const mlResultsService = mlResultsServiceProvider(mlApiServices);
        const anomalyExplorerService = new AnomalyExplorerChartsService(
          pluginsStartServices.data.query.timefilter.timefilter,
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
        const mlIndexUtils = indexServiceFactory(pluginsStartServices.data.dataViews);
        const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

        const anomalyChartsEmbeddableServices: AnomalyChartsEmbeddableServices = [
          coreStartServices,
          pluginsStartServices as MlDependencies,
          {
            anomalyDetectorService,
            anomalyExplorerService,
            mlFieldFormatService,
            mlResultsService,
          },
        ];

        const subscriptions = new Subscription();
        const interval$ = new BehaviorSubject<number | undefined>(undefined);
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
          anomalyChartsControlsApi,
          serializeAnomalyChartsState,
          anomalyChartsComparators,
          onAnomalyChartsDestroy,
        } = initializeAnomalyChartsControls(state, titlesApi);

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
                  {
                    ...coreStartServices,
                    ...pluginsStartServices,
                  },
                  pluginsStartServices.data.dataViews,
                  parentApi,
                  uuid,
                  {
                    ...serializeTitles(),
                    ...serializeAnomalyChartsState(),
                  }
                );
              } catch (e) {
                return Promise.reject();
              }
            },
            ...titlesApi,
            ...timeRangeApi,
            ...anomalyChartsControlsApi,
            query$,
            filters$,
            interval$,
            refresh$,
            setInterval: (v) => interval$.next(v),
            dataLoading,
            serializeState: () => {
              return {
                rawState: {
                  timeRange: undefined,
                  ...serializeTitles(),
                  ...serializeTimeRange(),
                  ...serializeAnomalyChartsState(),
                },
                references: [],
              };
            },
          },
          {
            ...timeRangeComparators,
            ...titleComparators,
            ...anomalyChartsComparators,
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

        const onRenderComplete = () => dataLoading.next(false);
        const onLoading = (v) => dataLoading.next(v);
        const onError = (error) => blockingError.next(error);

        const { uiSettings } = coreStartServices;
        const { uiActions } = pluginsStartServices;

        const contextServices = {
          mlServices: {
            ...anomalyChartsEmbeddableServices[2],
          },
          ...anomalyChartsEmbeddableServices[0],
          ...anomalyChartsEmbeddableServices[1],
        };
        const initialstate = api.serializeState().rawState;

        return {
          api,
          Component: () => {
            if (!apiHasExecutionContext(parentApi)) {
              throw new Error('Parent API does not have execution context');
            }

            const reload$ = useMemo(
              () =>
                fetch$(api).pipe(
                  skipWhile((fetchContext) => !fetchContext.isReload),
                  map((fetchContext) => Date.now())
                ),
              []
            );
            const lastReloadRequestTime = useObservable(reload$, Date.now());

            useReactEmbeddableExecutionContext(
              coreStartServices.executionContext,
              parentApi.executionContext,
              ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
              uuid
            );

            useUnmount(() => {
              onAnomalyChartsDestroy();
              onDestroy();
              subscriptions.unsubscribe();
            });

            return (
              <KibanaRenderContextProvider {...coreStartServices}>
                <KibanaContextProvider services={contextServices}>
                  <EmbeddableAnomalyChartsContainer
                    initialstate={initialstate}
                    api={api}
                    services={anomalyChartsEmbeddableServices}
                    onLoading={onLoading}
                    onRenderComplete={onRenderComplete}
                    onError={onError}
                    appliedTimeRange$={appliedTimeRange$}
                  />
                </KibanaContextProvider>
              </KibanaRenderContextProvider>
            );
          },
        };
      },
    };
  return factory;
};

// @TODO: REMOVE
// export class AnomalyChartsEmbeddableFactory
//   implements EmbeddableFactoryDefinition<AnomalyChartsEmbeddableInput>
// {
//   public readonly type = ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;

//   public readonly grouping = [
//     {
//       id: PLUGIN_ID,
//       getDisplayName: () => ML_APP_NAME,
//       getIconType: () => PLUGIN_ICON,
//     },
//   ];

//   constructor(
//     private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
//   ) {}

//   public async isEditable() {
//     return true;
//   }

//   public getDisplayName() {
//     return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.displayName', {
//       defaultMessage: 'Anomaly chart',
//     });
//   }

//   public getDescription() {
//     return i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.description', {
//       defaultMessage: 'View anomaly detection results in a chart.',
//     });
//   }

//   public async getExplicitInput(): Promise<Partial<AnomalyChartsEmbeddableInput>> {
//     const [coreStart, deps] = await this.getServices();

//     try {
//       const { resolveEmbeddableAnomalyChartsUserInput } = await import(
//         './anomaly_charts_setup_flyout'
//       );
//       return await resolveEmbeddableAnomalyChartsUserInput(coreStart, deps.data.dataViews);
//     } catch (e) {
//       return Promise.reject();
//     }
//   }

//   private async getServices(): Promise<AnomalyChartsEmbeddableServices> {
//     const [
//       [coreStart, pluginsStart],
//       { AnomalyDetectorService },
//       { fieldFormatServiceFactory },
//       { indexServiceFactory },
//       { mlApiServicesProvider },
//       { mlResultsServiceProvider },
//     ] = await Promise.all([
//       await this.getStartServices(),
//       await import('../../application/services/anomaly_detector_service'),
//       await import('../../application/services/field_format_service_factory'),
//       await import('../../application/util/index_service'),
//       await import('../../application/services/ml_api_service'),
//       await import('../../application/services/results_service'),
//     ]);

//     const httpService = new HttpService(coreStart.http);
//     const anomalyDetectorService = new AnomalyDetectorService(httpService);
//     const mlApiServices = mlApiServicesProvider(httpService);
//     const mlResultsService = mlResultsServiceProvider(mlApiServices);
//     const anomalyExplorerService = new AnomalyExplorerChartsService(
//       pluginsStart.data.query.timefilter.timefilter,
//       mlApiServices,
//       mlResultsService
//     );

//     // Note on the following services:
//     // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
//     //   but it's not being made available as part of global services. Since it's just
//     //   some stateless utils `useMlIndexUtils()` should be used from within components.
//     // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
//     //   so because of its own state it needs to be made available as a global service.
//     //   In the long run we should again try to get rid of it here and make it available via
//     //   its own context or possibly without having a singleton like state at all, since the
//     //   way this manages its own state right now doesn't consider React component lifecycles.
//     const mlIndexUtils = indexServiceFactory(pluginsStart.data.dataViews);
//     const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

//     return [
//       coreStart,
//       pluginsStart as MlDependencies,
//       {
//         anomalyDetectorService,
//         anomalyExplorerService,
//         mlFieldFormatService,
//         mlResultsService,
//       },
//     ];
//   }

//   public async create(initialInput: AnomalyChartsEmbeddableInput, parent?: IContainer) {
//     const services = await this.getServices();
//     const { AnomalyChartsEmbeddable } = await import('./anomaly_charts_embeddable');
//     return new AnomalyChartsEmbeddable(initialInput, services, parent);
//   }
// }
