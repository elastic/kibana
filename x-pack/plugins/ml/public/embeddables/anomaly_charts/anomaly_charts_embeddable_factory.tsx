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
import { Subscription, combineLatest, map, skipWhile } from 'rxjs';
import { apiHasParentApi, apiPublishesTimeRange, fetch$ } from '@kbn/presentation-publishing';
import useUnmount from 'react-use/lib/useUnmount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  apiHasExecutionContext,
  initializeTimeRange,
  initializeTitles,
} from '@kbn/presentation-publishing';
import useObservable from 'react-use/lib/useObservable';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '..';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { initializeAnomalyChartsControls } from './initialize_anomaly_charts_controls';
import type { AnomalyChartsEmbeddableApi, AnomalyChartsEmbeddableState } from './types';
import { LazyEmbeddableAnomalyChartsContainer } from './lazy_anomaly_charts_container';
import { getAnomalyChartsServiceDependencies } from './get_anomaly_charts_services_dependencies';

export const getAnomalyChartsReactEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<AnomalyChartsEmbeddableState, AnomalyChartsEmbeddableApi> =
    {
      type: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
      deserializeState: (state) => state.rawState,
      buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
        if (!apiHasExecutionContext(parentApi)) {
          throw new Error('Parent API does not have execution context');
        }
        const anomalyChartsDependencies = await getAnomalyChartsServiceDependencies(
          getStartServices
        );
        const [coreStartServices, pluginsStartServices, mlServices] = anomalyChartsDependencies;

        const subscriptions = new Subscription();

        const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
        const {
          api: timeRangeApi,
          comparators: timeRangeComparators,
          serialize: serializeTimeRange,
        } = initializeTimeRange(state);

        const {
          anomalyChartsControlsApi,
          dataLoadingApi,
          serializeAnomalyChartsState,
          anomalyChartsComparators,
          onAnomalyChartsDestroy,
        } = initializeAnomalyChartsControls(state, titlesApi, parentApi);

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
                  // @TODO: add data view based on job so filter bar
                  // reflects data view data
                  pluginsStartServices.data.dataViews,
                  parentApi,
                  uuid,
                  {
                    ...serializeTitles(),
                    ...serializeAnomalyChartsState(),
                  }
                );
                anomalyChartsControlsApi.updateUserInput(result);
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
                return Promise.reject();
              }
            },
            ...titlesApi,
            ...timeRangeApi,
            ...anomalyChartsControlsApi,
            ...dataLoadingApi,
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

        const { onRenderComplete, onLoading, onError } = dataLoadingApi;
        const contextServices = {
          mlServices: {
            ...anomalyChartsDependencies[2],
          },
          ...anomalyChartsDependencies[0],
          ...anomalyChartsDependencies[1],
        };
        const initialState = api.serializeState().rawState;

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
              subscriptions.unsubscribe();
            });

            return (
              <KibanaRenderContextProvider {...coreStartServices}>
                <KibanaContextProvider services={contextServices}>
                  <LazyEmbeddableAnomalyChartsContainer
                    severityThreshold={initialState.severityThreshold}
                    api={api}
                    services={anomalyChartsDependencies}
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
