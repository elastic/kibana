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

const selectQuery = (state: LensState) => state.lens.query;
const selectFilters = (state: LensState) => state.lens.filters;
const selectResolvedDateRange = (state: LensState) => state.lens.resolvedDateRange;

export const selectExternalContext = createSelector(
  [selectQuery, selectFilters, selectResolvedDateRange],
  (query, filters, dateRange) => ({
    dateRange,
    query,
    filters,
  })
);

export const selectExternalContextSearch = createSelector(selectExternalContext, (res) => ({
  query: res.query,
  timeRange: {
    from: res.dateRange.fromDate,
    to: res.dateRange.toDate,
  },
  filters: res.filters,
}));

export const selectDocState = createSelector(
  (state: LensState) => state.lens,
  ({ persistedDoc, query, visualization, datasourceStates, filters }) => ({
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

const selectVisualizationMap = (
  state: LensState,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap
) => visualizationMap;

const selectDatasourceMap = (
  state: LensState,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap
) => datasourceMap;

export const selectSavedObjectFormat = createSelector(
  [
    selectDocState,
    (state: LensState) => state.lens.activeDatasourceId,
    selectVisualizationMap,
    selectDatasourceMap,
  ],
  (docState, activeDatasourceId, visualizationMap, datasourceMap) => {
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
