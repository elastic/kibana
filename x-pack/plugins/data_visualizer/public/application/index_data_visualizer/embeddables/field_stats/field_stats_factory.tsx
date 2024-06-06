/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Reference } from '@kbn/content-management-utils';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasExecutionContext,
  fetch$,
  initializeTimeRange,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import fastIsEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import React, { useMemo, useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  skipWhile,
  Subscription,
  skip,
  switchMap,
} from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { pick } from 'lodash';
import type { DataVisualizerPluginStart } from '../../../../plugin';
import type {
  FieldStatisticsTableEmbeddableApi,
  FieldStatisticsTableEmbeddableState,
} from '../grid_embeddable/types';
import { FIELD_STATS_EMBEDDABLE_TYPE, FIELD_STATS_DATA_VIEW_REF_NAME } from './constants';
import { initializeFieldStatsControls } from './initialize_field_stats_controls';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';

export interface EmbeddableFieldStatsChartStartServices {
  data: DataPublicPluginStart;
}

export type EmbeddableFieldStatsChartType = typeof FIELD_STATS_EMBEDDABLE_TYPE;

const FieldStatisticsWrapper = dynamic(
  () => import('../grid_embeddable/field_stats_embeddable_wrapper')
);

export const getDependencies = async (
  getStartServices: StartServicesAccessor<
    DataVisualizerStartDependencies,
    DataVisualizerPluginStart
  >
) => {
  const [
    { http, uiSettings, notifications, ...startServices },
    { lens, data, usageCollection, fieldFormats },
  ] = await getStartServices();

  return {
    http,
    uiSettings,
    data,
    notifications,
    lens,
    usageCollection,
    fieldFormats,
    ...startServices,
  };
};

export const getFieldStatsChartEmbeddableFactory = (
  getStartServices: StartServicesAccessor<
    DataVisualizerStartDependencies,
    DataVisualizerPluginStart
  >
) => {
  const factory: ReactEmbeddableFactory<
    FieldStatisticsTableEmbeddableState,
    FieldStatisticsTableEmbeddableApi
  > = {
    type: FIELD_STATS_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState);
      // inject the reference
      const dataViewIdRef = state.references?.find(
        (ref) => ref.name === FIELD_STATS_DATA_VIEW_REF_NAME
      );
      // if the serializedState already contains a dataViewId, we don't want to overwrite it. (Unsaved state can cause this)
      if (dataViewIdRef && serializedState && !serializedState.dataViewId) {
        serializedState.dataViewId = dataViewIdRef?.id;
      }
      return serializedState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const [coreStart, pluginStart] = await getStartServices();

      const { http, uiSettings, notifications, ...startServices } = coreStart;
      const { lens, data, usageCollection, fieldFormats } = pluginStart;

      const deps = {
        http,
        uiSettings,
        data,
        notifications,
        lens,
        usageCollection,
        fieldFormats,
        ...startServices,
      };
      console.log('fieldFormats', deps.fieldFormats);

      const {
        api: timeRangeApi,
        comparators: timeRangeComparators,
        serialize: serializeTimeRange,
      } = initializeTimeRange(state);

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const {
        fieldStatsControlsApi,
        dataLoadingApi,
        fieldStatsControlsComparators,
        serializeFieldStatsChartState,
        onFieldStatsTableDestroy,
      } = initializeFieldStatsControls(state, titlesApi, parentApi);

      const defaultDataViewId = await deps.data.dataViews.getDefaultId();
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([
        state.dataViewId !== ''
          ? await deps.data.dataViews.get(state.dataViewId ?? defaultDataViewId)
          : undefined,
      ]);

      const subscriptions = new Subscription();
      subscriptions.add(
        fieldStatsControlsApi.dataViewId$
          .pipe(
            skip(1),
            skipWhile((dataViewId) => dataViewId === ''),
            switchMap((dataViewId) => deps.data.dataViews.get(dataViewId ?? defaultDataViewId))
          )
          .subscribe((nextSelectedDataView) => {
            // @TODO: remove
            console.log(`--@@nextSelectedDataView`, nextSelectedDataView);
            dataViews$.next([nextSelectedDataView]);
            // fieldStatsControlsApi.filter$.next([]);
            // fieldStatsControlsApi.globalQuery$.next();
          })
      );

      const api = buildApi(
        {
          ...timeRangeApi,
          ...titlesApi,
          ...fieldStatsControlsApi,
          ...dataLoadingApi,
          getTypeDisplayName: () =>
            i18n.translate('xpack.dataVisualizer.fieldStats.typeDisplayName', {
              defaultMessage: 'field statistics',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            try {
              const { resolveEmbeddableFieldStatsUserInput } = await import(
                './resolve_field_stats_embeddable_input'
              );
              const chartState = serializeFieldStatsChartState();
              const nextUpdate = await resolveEmbeddableFieldStatsUserInput(
                coreStart,
                pluginStart,
                parentApi,
                uuid,
                pick(chartState, ['dataViewId', 'viewType', 'esqlQuery'])
              );
              console.log(`--@@nextUpdate`, nextUpdate);
              fieldStatsControlsApi.updateUserInput(nextUpdate);
            } catch (e) {
              return Promise.reject(e);
            }
          },
          dataViews: dataViews$,
          serializeState: () => {
            const dataViewId = fieldStatsControlsApi.dataViewId.getValue();
            const references: Reference[] = dataViewId
              ? [
                  {
                    type: DATA_VIEW_SAVED_OBJECT_TYPE,
                    name: FIELD_STATS_DATA_VIEW_REF_NAME,
                    id: dataViewId,
                  },
                ]
              : [];
            return {
              rawState: {
                timeRange: undefined,
                ...serializeTitles(),
                ...serializeTimeRange(),
                ...serializeFieldStatsChartState(),
              },
              references,
            };
          },
        },
        {
          ...timeRangeComparators,
          ...titleComparators,
          ...fieldStatsControlsComparators,
        }
      );

      const globalQuery$ = fetch$(api).pipe(
        map((fetchContext) => {
          return fetchContext.query;
        }),
        distinctUntilChanged(fastIsEqual)
      );
      const globalFilters$ = fetch$(api).pipe(
        map((fetchContext) => fetchContext.filters),
        distinctUntilChanged(fastIsEqual)
      );
      const reload$ = fetch$(api).pipe(
        skipWhile((fetchContext) => !fetchContext.isReload),
        map((fetchContext) => Date.now())
      );

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [dataViews, esqlQuery, viewType] = useBatchedPublishingSubjects(
            api.dataViews,
            api.esqlQuery$,
            api.viewType$
          );
          const isEsqlMode = viewType === 'esql';
          const query = useObservable(globalQuery$, undefined);
          const filters = useObservable(globalFilters$, undefined);
          const dataView =
            Array.isArray(dataViews) && dataViews.length > 0 ? dataViews[0] : undefined;
          console.log(`--@@esqlQuery`, esqlQuery);
          console.log(`--@@query`, query);

          const lastReloadRequestTime = useObservable(reload$, Date.now());

          // On destroy
          useEffect(() => {
            return () => {
              subscriptions?.unsubscribe();
              if (onFieldStatsTableDestroy) {
                onFieldStatsTableDestroy();
              }
            };
          }, []);

          return (
            <FieldStatisticsWrapper
              shouldGetSubfields={false}
              dataView={dataView}
              esqlQuery={esqlQuery}
              query={query}
              filters={filters}
              lastReloadRequestTime={lastReloadRequestTime}
              esql={isEsqlMode}
            />
          );
        },
      };
    },
  };

  return factory;
};
