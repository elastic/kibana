/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { type DataPublicPluginStart, UI_SETTINGS } from '@kbn/data-plugin/public';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { BehaviorSubject, distinctUntilChanged, map, skipWhile } from 'rxjs';
import {
  apiHasExecutionContext,
  apiHasType,
  fetch$,
  initializeTimeRange,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React, { useMemo } from 'react';
import { pick } from 'lodash';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import fastIsEqual from 'fast-deep-equal';
import useObservable from 'react-use/lib/useObservable';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceContextProvider } from '../../hooks/use_data_source';
import { FilterQueryContextProvider } from '../../hooks/use_filters_query';
import { AiopsAppContext, type AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { ChartGridEmbeddableWrapper } from './embeddable_chart_component_wrapper';
import { initializeChangePointControls } from './initialize_chane_point_controls';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type {
  ChangePointEmbeddableApi,
  ChangePointEmbeddableRuntimeState,
  ChangePointEmbeddableState,
} from './types';
import { ChangePointDetectionControlsContextProvider } from '../../components/change_point_detection/change_point_detection_context';
import { ReloadContextProvider } from '../../hooks/use_reload';

export interface EmbeddableChangePointChartStartServices {
  data: DataPublicPluginStart;
}

export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export const getDependencies = async (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
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

export const getChangePointChartEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    ChangePointEmbeddableState,
    ChangePointEmbeddableApi,
    ChangePointEmbeddableRuntimeState
  > = {
    type: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
    deserializeState: (state) => state.rawState,
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

      const datePickerDeps = {
        ...pick(deps, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
        uiSettingsKeys: UI_SETTINGS,
      };

      const aiopsAppContextValue = {
        embeddingOrigin: apiHasType(parentApi) ? parentApi.type : EMBEDDABLE_ORIGIN,
        ...deps,
      } as unknown as AiopsAppDependencies;

      const {
        api: timeRangeApi,
        comparators: timeRangeComparators,
        serialize: serializeTimeRange,
      } = initializeTimeRange(state);

      const {
        changePointControlsApi,
        changePointControlsComparators,
        serializeChangePointChartState,
      } = initializeChangePointControls(state);

      const dataLoading = new BehaviorSubject<boolean | undefined>(true);
      const blockingError = new BehaviorSubject<Error | undefined>(undefined);

      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([
        await deps.data.dataViews.get(state.dataViewId),
      ]);

      const api = buildApi(
        {
          ...timeRangeApi,
          ...changePointControlsApi,
          getTypeDisplayName: () =>
            i18n.translate('xpack.aiops.changePointDetection.typeDisplayName', {
              defaultMessage: 'change point charts',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            try {
              const { resolveEmbeddableChangePointUserInput } = await import(
                './handle_explicit_input'
              );

              const result = await resolveEmbeddableChangePointUserInput(
                coreStart,
                pluginStart,
                serializeChangePointChartState()
              );

              changePointControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          dataLoading,
          blockingError,
          dataViews: dataViews$,
          serializeState: () => {
            return {
              rawState: {
                timeRange: undefined,
                ...serializeTimeRange(),
                ...serializeChangePointChartState(),
              },
              references: [],
            };
          },
        },
        {
          ...timeRangeComparators,
          ...changePointControlsComparators,
        }
      );

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [dataViewId, viewType, fn, metricField, splitField, maxSeriesToPlot, partitions] =
            useBatchedPublishingSubjects(
              api.dataViewId,
              api.viewType,
              api.fn,
              api.metricField,
              api.splitField,
              api.maxSeriesToPlot,
              api.partitions
            );

          const reload$ = useMemo(
            () =>
              fetch$(api).pipe(
                skipWhile((fetchContext) => !fetchContext.isReload),
                map((fetchContext) => Date.now())
              ),
            []
          );

          const timeRange$ = useMemo(
            () =>
              fetch$(api).pipe(
                map((fetchContext) => fetchContext.timeRange),
                distinctUntilChanged(fastIsEqual)
              ),
            []
          );

          const timeRange = useObservable(timeRange$, undefined);

          return (
            <KibanaRenderContextProvider {...startServices}>
              <AiopsAppContext.Provider value={aiopsAppContextValue}>
                <DatePickerContextProvider {...datePickerDeps}>
                  <ReloadContextProvider reload$={reload$}>
                    <DataSourceContextProvider dataViewId={dataViewId}>
                      <FilterQueryContextProvider timeRange={timeRange}>
                        <ChangePointDetectionControlsContextProvider>
                          <ChartGridEmbeddableWrapper
                            viewType={viewType}
                            timeRange={timeRange}
                            fn={fn}
                            metricField={metricField}
                            splitField={splitField}
                            maxSeriesToPlot={maxSeriesToPlot}
                            dataViewId={dataViewId}
                            partitions={partitions}
                            onLoading={(v) => dataLoading.next(v)}
                            onRenderComplete={() => dataLoading.next(false)}
                            onError={(error) => blockingError.next(error)}
                          />
                        </ChangePointDetectionControlsContextProvider>
                      </FilterQueryContextProvider>
                    </DataSourceContextProvider>
                  </ReloadContextProvider>
                </DatePickerContextProvider>
              </AiopsAppContext.Provider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };

  return factory;
};
