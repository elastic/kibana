/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectReference } from 'kibana/public';
import { Ast } from '@kbn/interpreter/common';
import { Datasource, DatasourcePublicAPI, Visualization } from '../../types';
import { buildExpression } from './expression_helpers';

export async function initializeDatasources(
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>,
  references?: SavedObjectReference[]
): Promise<Record<string, { isLoading: boolean; state: unknown }>> {
  const states: Record<string, { isLoading: boolean; state: unknown }> = {};
  await Promise.all(
    Object.entries(datasourceMap).map(([datasourceId, datasource]) => {
      if (datasourceStates[datasourceId]) {
        return datasource
          .initialize(datasourceStates[datasourceId].state || undefined, references)
          .then((datasourceState) => {
            states[datasourceId] = { isLoading: false, state: datasourceState };
          });
      }
    })
  );
  return states;
}

export function createDatasourceLayers(
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>
) {
  const datasourceLayers: Record<string, DatasourcePublicAPI> = {};
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
        });
      });
    });
  return datasourceLayers;
}

export async function persistedStateToExpression(
  visualization: Visualization,
  visualizationState: unknown,
  datasources: Record<string, Datasource>,
  persistedDatasourceStates: Record<string, unknown>,
  references?: SavedObjectReference[]
): Promise<Ast> {
  const datasourceStates = await initializeDatasources(
    datasources,
    Object.fromEntries(
      Object.entries(persistedDatasourceStates).map(([id, state]) => [
        id,
        { isLoading: false, state },
      ])
    ),
    references
  );

  const datasourceLayers = createDatasourceLayers(datasources, datasourceStates);

  return buildExpression({
    visualization,
    visualizationState,
    datasourceMap: datasources,
    datasourceStates,
    datasourceLayers,
  })!;
}
