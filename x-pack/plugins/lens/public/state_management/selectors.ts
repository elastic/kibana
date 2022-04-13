/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { SavedObjectReference } from 'kibana/server';
import { FilterManager } from 'src/plugins/data/public';
import { LensState } from './types';
import { Datasource, DatasourceMap, VisualizationMap } from '../types';
import { getDatasourceLayers } from '../editor_frame_service/editor_frame';

export const selectPersistedDoc = (state: LensState) => state.lens.persistedDoc;
export const selectQuery = (state: LensState) => state.lens.query;
export const selectSearchSessionId = (state: LensState) => state.lens.searchSessionId;
export const selectFilters = (state: LensState) => state.lens.filters;
export const selectResolvedDateRange = (state: LensState) => state.lens.resolvedDateRange;
export const selectVisualization = (state: LensState) => state.lens.visualization;
export const selectStagedPreview = (state: LensState) => state.lens.stagedPreview;
export const selectAutoApplyEnabled = (state: LensState) => !state.lens.autoApplyDisabled;
export const selectChangesApplied = (state: LensState) =>
  !state.lens.autoApplyDisabled || Boolean(state.lens.changesApplied);
export const selectDatasourceStates = (state: LensState) => state.lens.datasourceStates;
export const selectActiveDatasourceId = (state: LensState) => state.lens.activeDatasourceId;
export const selectActiveData = (state: LensState) => state.lens.activeData;
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
    { datasourceMap, visualizationMap, extractFilterReferences }
  ) => {
    const activeVisualization =
      visualization.state && visualization.activeId && visualizationMap[visualization.activeId];
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
    Object.entries(activeDatasources).forEach(([id, datasource]) => {
      const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(
        datasourceStates[id].state
      );
      persistibleDatasourceStates[id] = persistableState;
      references.push(...savedObjectReferences);
    });

    const { state: persistableFilters, references: filterReferences } =
      extractFilterReferences(filters);

    references.push(...filterReferences);

    return {
      savedObjectId: persistedDoc?.savedObjectId,
      title: persistedDoc?.title || '',
      description: persistedDoc?.description,
      visualizationType: visualization.activeId,
      type: 'lens',
      references,
      state: {
        visualization: visualization.state,
        query,
        filters: persistableFilters,
        datasourceStates: persistibleDatasourceStates,
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
  ],
  (datasourceStates, datasourceMap) => getDatasourceLayers(datasourceStates, datasourceMap)
);

export const selectFramePublicAPI = createSelector(
  [
    selectDatasourceStates,
    selectActiveData,
    selectInjectedDependencies as SelectInjectedDependenciesFunction<DatasourceMap>,
    selectResolvedDateRange,
  ],
  (datasourceStates, activeData, datasourceMap, dateRange) => {
    return {
      datasourceLayers: getDatasourceLayers(datasourceStates, datasourceMap),
      activeData,
      dateRange,
    };
  }
);
