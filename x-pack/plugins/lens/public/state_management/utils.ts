/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import type { DatasourceMap, DatasourceLayers } from '../types';
import type { DatasourceStates, DataViewsState } from './types';

export const getDatasourceLayers = memoizeOne(function getDatasourceLayers(
  datasourceStates: DatasourceStates,
  datasourceMap: DatasourceMap,
  indexPatterns: DataViewsState['indexPatterns']
) {
  const datasourceLayers: DatasourceLayers = {};
  Object.keys(datasourceMap)
    .filter((id) => datasourceStates[id] && !datasourceStates[id].isLoading)
    .forEach((id) => {
      const datasourceState = datasourceStates[id].state;
      const datasource = datasourceMap[id];

      const layers = datasource.getLayers(datasourceState);
      layers.forEach((layer) => {
        datasourceLayers[layer] = datasourceMap[id].getPublicAPI({
          state: datasourceState,
          layerId: layer,
          indexPatterns,
        });
      });
    });
  return datasourceLayers;
});
