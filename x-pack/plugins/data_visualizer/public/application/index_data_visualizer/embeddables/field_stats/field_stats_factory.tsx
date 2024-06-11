/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Reference } from '@kbn/content-management-utils';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { generateFilters, type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
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
import { cloneDeep } from 'lodash';
import React, { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  BehaviorSubject,
  map,
  skipWhile,
  Subscription,
  skip,
  switchMap,
  distinctUntilChanged,
} from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import fastIsEqual from 'fast-deep-equal';
import { isDefined } from '@kbn/ml-is-defined';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { FilterStateStore } from '@kbn/es-query';
import type { DataVisualizerTableState } from '../../../../../common/types';
import type { DataVisualizerPluginStart } from '../../../../plugin';
import type { FieldStatisticsTableEmbeddableState } from '../grid_embeddable/types';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
import { FIELD_STATS_EMBEDDABLE_TYPE, FIELD_STATS_DATA_VIEW_REF_NAME } from './constants';
import { initializeFieldStatsControls } from './initialize_field_stats_controls';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';
import type { FieldStatisticsTableEmbeddableApi } from './types';

export interface EmbeddableFieldStatsChartStartServices {
  data: DataPublicPluginStart;
}
export type EmbeddableFieldStatsChartType = typeof FIELD_STATS_EMBEDDABLE_TYPE;

const FieldStatisticsWrapper = dynamic(() => import('../grid_embeddable/field_stats_wrapper'));

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
        resetData$,
      } = initializeFieldStatsControls(state);

      const defaultDataViewId = await deps.data.dataViews.getDefaultId();
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        state.dataViewId !== '' && defaultDataViewId
          ? [await deps.data.dataViews.get(state.dataViewId ?? defaultDataViewId)]
          : undefined
      );

      const subscriptions = new Subscription();
      subscriptions.add(
        fieldStatsControlsApi.dataViewId$
          .pipe(
            skip(1),
            skipWhile((dataViewId) => dataViewId === '' && defaultDataViewId === null),
            switchMap((dataViewId) => deps.data.dataViews.get(dataViewId ?? defaultDataViewId))
          )
          .subscribe((nextSelectedDataView) => {
            dataViews$.next([nextSelectedDataView]);
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
                chartState,
                fieldStatsControlsApi
              );

              fieldStatsControlsApi.updateUserInput(nextUpdate);
            } catch (e) {
              return Promise.reject(e);
            }
          },
          dataViews: dataViews$,
          serializeState: () => {
            const dataViewId = fieldStatsControlsApi.dataViewId$?.getValue();
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

      const reload$ = fetch$(api).pipe(
        skipWhile((fetchContext) => !fetchContext.isReload),
        map(() => Date.now())
      );
      const query$ = fetch$(api).pipe(
        map((fetchContext) => fetchContext.query),
        distinctUntilChanged(fastIsEqual)
      );
      const filters$ = fetch$(api).pipe(
        map((fetchContext) => fetchContext.filters),
        distinctUntilChanged(fastIsEqual)
      );
      const reset$ = resetData$.pipe(skip(1), distinctUntilChanged());

      const onTableUpdate = (changes: Partial<DataVisualizerTableState>) => {
        if (isDefined(changes?.showDistributions)) {
          fieldStatsControlsApi.showDistributions$.next(changes.showDistributions);
        }
      };
      const statsTableCss = css({
        width: '100%',
        height: '100%',
        overflowY: 'auto',
      });

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [dataViews, esqlQuery, viewType, showPreviewByDefault] =
            useBatchedPublishingSubjects(
              api.dataViews,
              api.query$,
              api.viewType$,
              api.showDistributions$
            );
          const globalQuery = useObservable(query$, undefined);
          const globalFilters = useObservable(filters$, undefined);
          const lastReloadRequestTime = useObservable(reload$, Date.now());

          const isEsqlMode = viewType === FieldStatsInitializerViewType.ESQL;

          const dataView =
            Array.isArray(dataViews) && dataViews.length > 0 ? dataViews[0] : undefined;
          const onAddFilter = (
            field: string | DataViewField,
            value: string,
            operator: '+' | '-'
          ) => {
            if (!dataView || !pluginStart.data) return;
            let filters = generateFilters(
              pluginStart.data.query.filterManager,
              field,
              value,
              operator,
              dataView
            );
            filters = filters.map((filter) => ({
              ...filter,
              $state: { store: FilterStateStore.APP_STATE },
            }));
            pluginStart.data.query.filterManager.addFilters(filters);
          };

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
            <EuiFlexItem css={statsTableCss} data-test-subj="dashboardFieldStatsEmbeddedContent">
              <FieldStatisticsWrapper
                shouldGetSubfields={false}
                dataView={dataView}
                esqlQuery={esqlQuery}
                query={globalQuery}
                filters={globalFilters}
                lastReloadRequestTime={lastReloadRequestTime}
                isEsqlMode={isEsqlMode}
                onTableUpdate={onTableUpdate}
                showPreviewByDefault={showPreviewByDefault}
                onAddFilter={onAddFilter}
                resetData$={reset$}
              />
            </EuiFlexItem>
          );
        },
      };
    },
  };

  return factory;
};
