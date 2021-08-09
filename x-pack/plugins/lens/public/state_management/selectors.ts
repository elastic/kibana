/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { SavedObjectReference } from 'kibana/server';
import { LensState } from './types';
import { extractFilterReferences } from '../persistence';
import { Datasource, DatasourceMap, VisualizationMap } from '../types';
import { createDatasourceLayers } from '../editor_frame_service/editor_frame';

export const selectPersistedDoc = (state: LensState) => state.lens.persistedDoc;
export const selectQuery = (state: LensState) => state.lens.query;
export const selectFilters = (state: LensState) => state.lens.filters;
export const selectResolvedDateRange = (state: LensState) => state.lens.resolvedDateRange;
export const selectVisualization = (state: LensState) => state.lens.visualization;
export const selectStagedPreview = (state: LensState) => state.lens.stagedPreview;
export const selectDatasourceStates = (state: LensState) => state.lens.datasourceStates;
export const selectActiveDatasourceId = (state: LensState) => state.lens.activeDatasourceId;
export const selectActiveData = (state: LensState) => state.lens.activeData;

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

// to correct
export const selectDocState = createSelector(
  [selectPersistedDoc, selectQuery, selectVisualization, selectDatasourceStates, selectFilters],
  (persistedDoc, query, visualization, datasourceStates, filters) => ({
    savedObjectId: persistedDoc?.savedObjectId,
    title: persistedDoc?.title || '',
    description: persistedDoc?.description,
    visualizationType: visualization.activeId,
    state: {
      datasourceStates,
      visualization: visualization.state,
      query,
      filters,
    },
  })
);

const selectDatasourceMap = (state: LensState, datasourceMap: DatasourceMap) => datasourceMap;

const selectVisualizationMap = (
  state: LensState,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap
) => visualizationMap;

export const selectSavedObjectFormat = createSelector(
  [selectDocState, selectActiveDatasourceId, selectDatasourceMap, selectVisualizationMap],
  (docState, activeDatasourceId, datasourceMap, visualizationMap) => {
    const { datasourceStates, visualization, filters } = docState.state;
    const activeVisualization =
      visualization && docState.visualizationType && visualizationMap[docState.visualizationType];
    const activeDatasource =
      datasourceStates && activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
        ? datasourceMap[activeDatasourceId]
        : undefined;

    if (!activeDatasource || !activeVisualization || !visualization) {
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

    const { persistableFilters, references: filterReferences } = extractFilterReferences(filters);

    references.push(...filterReferences);

    return {
      ...docState,
      type: 'lens',
      state: {
        ...docState.state,
        filters: persistableFilters,
        datasourceStates: persistibleDatasourceStates,
      },
      references,
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
  [selectDatasourceStates, selectDatasourceMap],
  (datasourceStates, datasourceMap) => createDatasourceLayers(datasourceStates, datasourceMap)
);

export const selectFramePublicAPI = createSelector(
  [selectDatasourceStates, selectActiveData, selectDatasourceMap],
  (datasourceStates, activeData, datasourceMap) => ({
    datasourceLayers: createDatasourceLayers(datasourceStates, datasourceMap),
    activeData,
  })
);
