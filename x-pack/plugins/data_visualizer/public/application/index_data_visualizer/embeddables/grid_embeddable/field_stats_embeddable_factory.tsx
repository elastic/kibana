/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import React, { Suspense } from 'react';
import { initializeTitles } from '@kbn/presentation-publishing';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { DataVisualizerCoreSetup } from '../../../../plugin';
import { FIELD_STATS_EMBED_ID } from './constants';
import { EmbeddableLoading } from './embeddable_loading_fallback';
import type {
  FieldStatisticsTableEmbeddableApi,
  FieldStatisticsTableEmbeddableParentApi,
  FieldStatisticsTableEmbeddableState,
} from './types';
const LazyFieldStatsEmbeddableWrapper = React.lazy(
  () => import('./field_stats_embeddable_wrapper')
);

export const getFieldStatsTableFactory = (core: DataVisualizerCoreSetup) => {
  const fieldListEmbeddableFactory: ReactEmbeddableFactory<
    FieldStatisticsTableEmbeddableState,
    FieldStatisticsTableEmbeddableApi
  > = {
    type: FIELD_STATS_EMBED_ID,
    deserializeState: (state) => {
      return state.rawState ?? {};
    },
    buildEmbeddable: async (initialState, buildApi, uuid, unknownParentApi) => {
      const parentApi = unknownParentApi as FieldStatisticsTableEmbeddableParentApi;

      const startServices = await core.getStartServices();
      const servicesToOverride = parentApi.overrideServices ?? {};
      const services = { ...startServices[0], ...startServices[1], ...servicesToOverride };
      const datePickerDeps = {
        ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
        uiSettingsKeys: UI_SETTINGS,
      };
      const dataViews = services.data.dataViews;

      const showDistributions$ =
        initialState.showPreviewByDefault !== undefined
          ? new BehaviorSubject(initialState.showPreviewByDefault)
          : new BehaviorSubject(true);

      // set up data views
      const defaultDataViewId = await dataViews.getDefaultId();
      const dataView =
        initialState.dataView ??
        (defaultDataViewId ? await dataViews.get(defaultDataViewId) : undefined);
      const queryBarState = services.data.query.getState();

      const embeddableState$ = parentApi.embeddableState$
        ? parentApi.embeddableState$
        : new BehaviorSubject<FieldStatisticsTableEmbeddableState>({
            id: 'dashboard_field_stats_embeddable',
            dataView,
            query: queryBarState.query,
            filters: queryBarState.filters,
            shouldGetSubfields: false,
          });

      const onAddFilter = parentApi.onAddFilter;
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);
      const api = buildApi(
        {
          ...titlesApi,
          showDistributions$,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
              },
            };
          },
        },
        {
          ...titleComparators,
        }
      );
      const kibanaRenderServices = pick(services, 'analytics', 'i18n', 'theme');

      return {
        api,
        Component: () => {
          return (
            <KibanaRenderContextProvider {...kibanaRenderServices}>
              <KibanaContextProvider services={services}>
                <DatePickerContextProvider {...datePickerDeps}>
                  <Suspense fallback={<EmbeddableLoading />}>
                    <LazyFieldStatsEmbeddableWrapper
                      id={uuid}
                      embeddableState$={embeddableState$}
                      onAddFilter={onAddFilter}
                      onTableUpdate={(changes) => {
                        if ('showDistributions' in changes && Object.keys(changes).length === 1) {
                          showDistributions$.next(changes.showDistributions);
                        }
                      }}
                    />
                  </Suspense>
                </DatePickerContextProvider>
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };
  return fieldListEmbeddableFactory;
};
