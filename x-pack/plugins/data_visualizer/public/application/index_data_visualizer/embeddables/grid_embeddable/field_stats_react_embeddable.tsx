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
import React, { useEffect } from 'react';
import { BehaviorSubject, skip, Subscription, switchMap } from 'rxjs';
import {
  apiHasParentApi,
  apiPublishesTimeRange,
  initializeTimeRange,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { FIELD_STATS_DATA_VIEW_REF_NAME, FIELD_STATS_ID } from './constants';
import type { FieldListApi, FieldListSerializedStateState } from './types';

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

export const getFieldStatsTableFactory = (
  core: CoreStart,
  plugins: DataVisualizerStartDependencies
) => {
  const fieldListEmbeddableFactory: ReactEmbeddableFactory<
    FieldListSerializedStateState,
    FieldListApi
  > = {
    type: FIELD_STATS_ID,
    deserializeState: (state) => {
      // @TODO: remove
      console.log(`--@@state`, state.rawState);
      return state.rawState;
      // const serializedState = cloneDeep(state.rawState) as FieldListSerializedStateState;
      // // inject the reference
      // const dataViewIdRef = state.references?.find(
      //   (ref) => ref.name === FIELD_STATS_DATA_VIEW_REF_NAME
      // );
      // // if the serializedState already contains a dataViewId, we don't want to overwrite it. (Unsaved state can cause this)
      // if (dataViewIdRef && serializedState && !serializedState.dataViewId) {
      //   serializedState.dataViewId = dataViewIdRef?.id;
      // }
      // return serializedState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi) => {
      console.log(
        '--@@initialState, buildAp, uuid, parentApi',
        initialState,
        buildApi,
        uuid,
        parentApi
      );
      console.log('--@@getFieldStatsTableFactory plugins ', plugins);

      const subscriptions = new Subscription();
      // const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

      // const dataViews = plugins.data.dataViews;
      // // set up data views
      // const [allDataViews, defaultDataViewId] = await Promise.all([
      //   dataViews.getIdsWithTitle(),
      //   dataViews.getDefaultId(),
      // ]);
      // if (!defaultDataViewId || allDataViews.length === 0) {
      //   throw new Error(
      //     i18n.translate('embeddableExamples.unifiedFieldList.noDefaultDataViewErrorMessage', {
      //       defaultMessage: 'The field list must be used with at least one Data View present',
      //     })
      //   );
      // }
      // const initialDataViewId = initialState.dataViewId ?? defaultDataViewId;
      // const initialDataView = await dataViews.get(initialDataViewId);
      // const selectedDataViewId$ = new BehaviorSubject<string | undefined>(initialDataViewId);
      // const dataViews$ = new BehaviorSubject<DataView[] | undefined>([initialDataView]);

      // subscriptions.add(
      //   selectedDataViewId$
      //     .pipe(
      //       skip(1),
      //       switchMap((dataViewId) => dataViews.get(dataViewId ?? defaultDataViewId))
      //     )
      //     .subscribe((nextSelectedDataView) => {
      //       dataViews$.next([nextSelectedDataView]);
      //     })
      // );

      // const selectedFieldNames$ = new BehaviorSubject<string[] | undefined>(
      //   initialState.selectedFieldNames
      // );
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

      // @TODO: remove
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

      // @TODO: remove
      console.log(`--@@api`, api);
      return {
        api,
        Component: () => {
          // const [renderDataViews, selectedFieldNames] = useBatchedPublishingSubjects(
          //   dataViews$,
          //   selectedFieldNames$
          // );

          // const selectedDataView = renderDataViews?.[0];

          // On destroy
          useEffect(() => {
            return () => {
              subscriptions.unsubscribe();
            };
          }, []);

          return (
            <EuiFlexGroup direction="column" gutterSize="none">
              <div>Test</div>
            </EuiFlexGroup>
          );
        },
      };
    },
  };
  return fieldListEmbeddableFactory;
};
