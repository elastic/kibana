/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { FilterManager } from '@kbn/data-plugin/public';
import { SavedObjectReference } from '@kbn/core/public';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { LensState } from './types';
import { Datasource, DatasourceMap, VisualizationMap } from '../types';
import { getDatasourceLayers } from './utils';

export const selectPersistedDoc = (state: LensState) => state.lens.persistedDoc;
export const selectQuery = (state: LensState) => state.lens.query;
export const selectSearchSessionId = (state: LensState) => state.lens.searchSessionId;
export const selectFilters = (state: LensState) => state.lens.filters;
export const selectResolvedDateRange = (state: LensState) => state.lens.resolvedDateRange;
export const selectAdHocDataViews = (state: LensState) =>
  Object.fromEntries(
    Object.values(state.lens.dataViews.indexPatterns)
      .filter((indexPattern) => !indexPattern.isPersisted)
      .map((indexPattern) => [indexPattern.id, indexPattern.spec!])
  );
export const selectVisualization = (state: LensState) => state.lens.visualization;
export const selectStagedPreview = (state: LensState) => state.lens.stagedPreview;
export const selectStagedActiveData = (state: LensState) =>
  state.lens.stagedPreview?.activeData || state.lens.activeData;
export const selectAutoApplyEnabled = (state: LensState) => !state.lens.autoApplyDisabled;
export const selectChangesApplied = (state: LensState) =>
  !state.lens.autoApplyDisabled || Boolean(state.lens.changesApplied);
export const selectDatasourceStates = (state: LensState) => state.lens.datasourceStates;
export const selectVisualizationState = (state: LensState) => state.lens.visualization;
export const selectActiveDatasourceId = (state: LensState) => state.lens.activeDatasourceId;
export const selectActiveData = (state: LensState) => state.lens.activeData;
export const selectDataViews = (state: LensState) => state.lens.dataViews;
export const selectIsFullscreenDatasource = (state: LensState) =>
  Boolean(state.lens.isFullscreenDatasource);

let applyChangesCounter: number | undefined;
export const selectTriggerApplyChanges = (state: LensState) => {
  const shouldApply = state.lens.applyChangesCounter !== applyChangesCounter;
  applyChangesCounter = state.lens.applyChangesCounter;
  return shouldApply;
};

export const selectExecutionContext = createSelector(
  [selectQuery, selectFilters, selectResolvedDateRange],
  (query, filters, dateRange) => ({
    dateRange,
    query,
    filters,
  })
);

export const selectExecutionContextSearch = createSelector(selectExecutionContext, (res) => ({
  query: res.query,
  timeRange: {
    from: res.dateRange.fromDate,
    to: res.dateRange.toDate,
  },
  filters: res.filters,
  disableShardWarnings: true,
}));

const selectInjectedDependencies = (_state: LensState, dependencies: unknown) => dependencies;

// use this type to cast selectInjectedDependencies to require whatever outside dependencies the selector needs
type SelectInjectedDependenciesFunction<T> = (state: LensState, dependencies: T) => T;

export const selectSavedObjectFormat = createSelector(
  [
    selectPersistedDoc,
    selectVisualization,
    selectDatasourceStates,
    selectQuery,
    selectFilters,
    selectActiveDatasourceId,
    selectAdHocDataViews,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<{
      datasourceMap: DatasourceMap;
      visualizationMap: VisualizationMap;
      extractFilterReferences: FilterManager['extract'];
    }>,
  ],
  (
    persistedDoc,
    visualization,
    datasourceStates,
    query,
    filters,
    activeDatasourceId,
    adHocDataViews,
    { datasourceMap, visualizationMap, extractFilterReferences }
  ) => {
    const activeVisualization =
      visualization.state && visualization.activeId
        ? visualizationMap[visualization.activeId]
        : null;
    const activeDatasource =
      datasourceStates && activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
        ? datasourceMap[activeDatasourceId]
        : undefined;

    if (!activeDatasource || !activeVisualization) {
      return;
    }

    const activeDatasources: Record<string, Datasource> = Object.keys(datasourceStates).reduce(
      (acc, datasourceId) => ({
        ...acc,
        [datasourceId]: datasourceMap[datasourceId],
      }),
      {}
    );

    const persistibleDatasourceStates: Record<string, unknown> = {};
    const references: SavedObjectReference[] = [];
    const internalReferences: SavedObjectReference[] = [];
    Object.entries(activeDatasources).forEach(([id, datasource]) => {
      const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(
        datasourceStates[id].state
      );
      persistibleDatasourceStates[id] = persistableState;
      savedObjectReferences.forEach((r) => {
        if (r.type === 'index-pattern' && adHocDataViews[r.id]) {
          internalReferences.push(r);
        } else {
          references.push(r);
        }
      });
    });

    let persistibleVisualizationState = visualization.state;
    if (activeVisualization.getPersistableState) {
      const { state: persistableState, savedObjectReferences } =
        activeVisualization.getPersistableState(visualization.state);
      persistibleVisualizationState = persistableState;
      savedObjectReferences.forEach((r) => {
        if (r.type === 'index-pattern' && adHocDataViews[r.id]) {
          internalReferences.push(r);
        } else {
          references.push(r);
        }
      });
    }

    const persistableAdHocDataViews = Object.fromEntries(
      Object.entries(adHocDataViews).map(([id, dataView]) => {
        const { references: dataViewReferences, state } =
          DataViewPersistableStateService.extract(dataView);
        references.push(...dataViewReferences);
        return [id, state];
      })
    );

    const adHocFilters = filters
      .filter((f) => !references.some((r) => r.type === 'index-pattern' && r.id === f.meta.index))
      .map((f) => ({ ...f, meta: { ...f.meta, value: undefined } }));

    const referencedFilters = filters.filter((f) =>
      references.some((r) => r.type === 'index-pattern' && r.id === f.meta.index)
    );

    const { state: persistableFilters, references: filterReferences } =
      extractFilterReferences(referencedFilters);

    references.push(...filterReferences);

    return {
      savedObjectId: persistedDoc?.savedObjectId,
      title: persistedDoc?.title || '',
      description: persistedDoc?.description,
      visualizationType: visualization.activeId,
      type: 'lens',
      references,
      state: {
        visualization: persistibleVisualizationState,
        query,
        filters: [...persistableFilters, ...adHocFilters],
        datasourceStates: persistibleDatasourceStates,
        internalReferences,
        adHocDataViews: persistableAdHocDataViews,
      },
    };
  }
);

export const selectCurrentVisualization = createSelector(
  [selectVisualization, selectStagedPreview],
  (visualization, stagedPreview) => (stagedPreview ? stagedPreview.visualization : visualization)
);

export const selectCurrentDatasourceStates = createSelector(
  [selectDatasourceStates, selectStagedPreview],
  (datasourceStates, stagedPreview) =>
    stagedPreview ? stagedPreview.datasourceStates : datasourceStates
);

export const selectAreDatasourcesLoaded = createSelector(
  selectDatasourceStates,
  (datasourceStates) =>
    Object.values(datasourceStates).every(({ isLoading }) => isLoading === false)
);

export const selectDatasourceLayers = createSelector(
  [
    selectDatasourceStates,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<DatasourceMap>,
    selectDataViews,
  ],
  (datasourceStates, datasourceMap, dataViews) =>
    getDatasourceLayers(datasourceStates, datasourceMap, dataViews.indexPatterns)
);

export const selectFramePublicAPI = createSelector(
  [
    selectCurrentDatasourceStates,
    selectActiveData,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<DatasourceMap>,
    selectResolvedDateRange,
    selectDataViews,
  ],
  (datasourceStates, activeData, datasourceMap, dateRange, dataViews) => {
    return {
      datasourceLayers: getDatasourceLayers(
        datasourceStates,
        datasourceMap,
        dataViews.indexPatterns
      ),
      activeData,
      dateRange,
      dataViews,
    };
  }
);

export const selectFrameDatasourceAPI = createSelector(
  [selectFramePublicAPI, selectExecutionContext],
  (framePublicAPI, context) => ({ ...context, ...framePublicAPI })
);
