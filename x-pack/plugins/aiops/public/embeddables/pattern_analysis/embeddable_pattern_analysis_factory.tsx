/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
  PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
} from '@kbn/aiops-log-pattern-analysis/constants';
import type { Reference } from '@kbn/content-management-utils';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
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
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, skipWhile } from 'rxjs';
import { getPatternAnalysisComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializePatternAnalysisControls } from './initialize_pattern_analysis_controls';
import type {
  PatternAnalysisEmbeddableApi,
  PatternAnalysisEmbeddableRuntimeState,
  PatternAnalysisEmbeddableState,
} from './types';

export interface EmbeddablePatternAnalysisStartServices {
  data: DataPublicPluginStart;
}

export type EmbeddablePatternAnalysisType = typeof EMBEDDABLE_PATTERN_ANALYSIS_TYPE;

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

export const getPatternAnalysisEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    PatternAnalysisEmbeddableState,
    PatternAnalysisEmbeddableRuntimeState,
    PatternAnalysisEmbeddableApi
  > = {
    type: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState);
      // inject the reference
      const dataViewIdRef = state.references?.find(
        (ref) => ref.name === PATTERN_ANALYSIS_DATA_VIEW_REF_NAME
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
        patternAnalysisControlsApi,
        serializePatternAnalysisChartState,
        patternAnalysisControlsComparators,
      } = initializePatternAnalysisControls(state);

      const dataLoading = new BehaviorSubject<boolean | undefined>(true);
      const blockingError = new BehaviorSubject<Error | undefined>(undefined);

      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([
        await deps.data.dataViews.get(
          state.dataViewId ?? (await deps.data.dataViews.getDefaultId())
        ),
      ]);

      const api = buildApi(
        {
          ...timeRangeApi,
          ...titlesApi,
          ...patternAnalysisControlsApi,
          getTypeDisplayName: () =>
            i18n.translate('xpack.aiops.patternAnalysis.typeDisplayName', {
              defaultMessage: 'pattern analysis',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            try {
              const { resolveEmbeddablePatternAnalysisUserInput } = await import(
                './resolve_pattern_analysis_config_input'
              );

              const result = await resolveEmbeddablePatternAnalysisUserInput(
                coreStart,
                pluginStart,
                parentApi,
                uuid,
                false,
                patternAnalysisControlsApi,
                undefined,
                serializePatternAnalysisChartState()
              );

              patternAnalysisControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          dataLoading,
          blockingError,
          dataViews: dataViews$,
          serializeState: () => {
            const dataViewId = patternAnalysisControlsApi.dataViewId.getValue();
            const references: Reference[] = dataViewId
              ? [
                  {
                    type: DATA_VIEW_SAVED_OBJECT_TYPE,
                    name: PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
                    id: dataViewId,
                  },
                ]
              : [];
            return {
              rawState: {
                timeRange: undefined,
                ...serializeTitles(),
                ...serializeTimeRange(),
                ...serializePatternAnalysisChartState(),
              },
              references,
            };
          },
        },
        {
          ...timeRangeComparators,
          ...titleComparators,
          ...patternAnalysisControlsComparators,
        }
      );

      const PatternAnalysisComponent = getPatternAnalysisComponent(coreStart, pluginStart);

      const onLoading = (v: boolean) => dataLoading.next(v);
      const onRenderComplete = () => dataLoading.next(false);
      const onError = (error: Error) => blockingError.next(error);

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [
            dataViewId,
            fieldName,
            minimumTimeRangeOption,
            randomSamplerMode,
            randomSamplerProbability,
          ] = useBatchedPublishingSubjects(
            api.dataViewId,
            api.fieldName,
            api.minimumTimeRangeOption,
            api.randomSamplerMode,
            api.randomSamplerProbability
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

          const lastReloadRequestTime = useObservable(reload$, Date.now());
          const timeRange = useObservable(timeRange$, undefined);

          let embeddingOrigin;
          if (apiHasExecutionContext(parentApi)) {
            embeddingOrigin = parentApi.executionContext.type;
          }

          return (
            <PatternAnalysisComponent
              dataViewId={dataViewId}
              fieldName={fieldName}
              minimumTimeRangeOption={minimumTimeRangeOption}
              randomSamplerMode={randomSamplerMode}
              randomSamplerProbability={randomSamplerProbability}
              timeRange={timeRange}
              onLoading={onLoading}
              onRenderComplete={onRenderComplete}
              onError={onError}
              embeddingOrigin={embeddingOrigin}
              lastReloadRequestTime={lastReloadRequestTime}
            />
          );
        },
      };
    },
  };

  return factory;
};
