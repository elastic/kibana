/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { type UnifiedFieldListSidebarContainerProps } from '@kbn/unified-field-list';
import { cloneDeep } from 'lodash';
import React, { useEffect, Suspense } from 'react';
import { BehaviorSubject, skip, Subscription, switchMap } from 'rxjs';
import {
  apiHasParentApi,
  apiPublishesTimeRange,
  initializeTimeRange,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
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
      console.log(
        `--@@titlesApi, titleComparators, serializeTitles`,
        titlesApi,
        titleComparators,
        serializeTitles
      );
      const api = buildApi(
        {
          ...titlesApi,
          ...titleComparators,
          // dataViews: dataViews$,
          serializeState: () => {
            // const dataViewId = selectedDataViewId$.getValue();
            // const references: Reference[] = dataViewId
            //   ? [
            //       {
            //         type: DATA_VIEW_SAVED_OBJECT_TYPE,
            //         name: FIELD_STATS_DATA_VIEW_REF_NAME,
            //         id: dataViewId,
            //       },
            //     ]
            //   : [];
            return {
              rawState: {
                ...serializeTitles(),
                // // here we skip serializing the dataViewId, because the reference contains that information.
                // selectedFieldNames: selectedFieldNames$.getValue(),
              },
              // references,
            };
          },
        },
        {
          ...titleComparators,
        }
      );

      const startServices = await core.getStartServices();

      const I18nContext = startServices[0].i18n.Context;
      const servicesToOverride = parentApi.overrideServices ?? {};
      // @TODO: remove
      console.log(`--@@servicesToOverride`, servicesToOverride);

      const services = { ...startServices[0], ...startServices[1], ...servicesToOverride };
      const datePickerDeps = {
        ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
        uiSettingsKeys: UI_SETTINGS,
      };

      return {
        api,
        Component: () => {
          // const [renderDataViews, selectedFieldNames] = useBatchedPublishingSubjects(
          //   dataViews$,
          //   selectedFieldNames$
          // );

          // const selectedDataView = renderDataViews?.[0];

          return (
            <I18nContext>
              <KibanaThemeProvider theme$={services.theme.theme$}>
                <KibanaContextProvider services={services}>
                  <DatePickerContextProvider {...datePickerDeps}>
                    <Suspense fallback={<EmbeddableLoading />}>
                      <LazyFieldStatsEmbeddableWrapper
                        id={uuid}
                        embeddableState$={parentApi.embeddableState$}
                        onOutputChange={(output) => console.log(output)}
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
