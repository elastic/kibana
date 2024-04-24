/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { type UnifiedFieldListSidebarContainerProps } from '@kbn/unified-field-list';
import React, { Suspense, useMemo } from 'react';
import { initializeTitles } from '@kbn/presentation-publishing';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { FIELD_STATS_EMBED_ID } from './constants';
import type { FieldListApi, FieldListSerializedStateState } from './types';
import { EmbeddableLoading } from './embeddable_loading_fallback';
const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: '',
    localStorageKeyPrefix: 'examples',
    timeRangeUpdatesType: 'timefilter',
    compressed: true,
    showSidebarToggleButton: false,
    disablePopularFields: true,
  };
};

const LazyFieldStatsEmbeddableWrapper = React.lazy(
  () => import('./field_stats_embeddable_wrapper')
);

export const getFieldStatsTableFactory = (core: CoreStart) => {
  const fieldListEmbeddableFactory: ReactEmbeddableFactory<
    FieldListSerializedStateState,
    FieldListApi
  > = {
    type: FIELD_STATS_EMBED_ID,
    deserializeState: (state) => {
      return state.rawState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi) => {
      const id = uuid.toString();

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState); // @TODO: remove
      const api = buildApi(
        {
          ...titlesApi,
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

      // @todo: Remove usage of deprecated React rendering utilities
      // see https://github.com/elastic/kibana/pull/181094
      const startServices = await core.getStartServices();
      const I18nContext = startServices[0].i18n.Context;
      const servicesToOverride = parentApi.overrideServices ?? {};
      const services = { ...startServices[0], ...startServices[1], ...servicesToOverride };
      const datePickerDeps = {
        ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
        uiSettingsKeys: UI_SETTINGS,
      };

      return {
        api,
        Component: () => {
          const embeddableState$ = useMemo(
            () =>
              parentApi.embeddableState
                ? parentApi.embeddableState
                : new BehaviorSubject<FieldStatisticTableEmbeddableState | undefined>(),
            []
          );

          return (
            <I18nContext>
              <KibanaThemeProvider theme$={services.theme.theme$}>
                <KibanaContextProvider services={services}>
                  <DatePickerContextProvider {...datePickerDeps}>
                    <Suspense fallback={<EmbeddableLoading />}>
                      <LazyFieldStatsEmbeddableWrapper
                        id={uuid}
                        embeddableState$={parentApi.embeddableState$}
                        onAddFilter={parentApi.onAddFilter}
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
  return fieldListEmbeddableFactory;
};
