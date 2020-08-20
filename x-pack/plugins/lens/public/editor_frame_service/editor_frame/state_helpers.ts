/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectReference } from 'kibana/public';
import { Ast } from '@kbn/interpreter/common';
import { Datasource, DatasourcePublicAPI, Visualization } from '../../types';
import { buildExpression } from './expression_helpers';

export function initializeDatasources(
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>,
  // TODO turn this into a single return value via promise
  onInit: (id: string, state: unknown) => void,
  onError: (e: { message: string }) => void,
  references?: SavedObjectReference[]
) {
  Object.entries(datasourceMap).forEach(([datasourceId, datasource]) => {
    if (datasourceStates[datasourceId] && datasourceStates[datasourceId].isLoading) {
      datasource
        .initialize(datasourceStates[datasourceId].state || undefined, references)
        .then((datasourceState) => {
          onInit(datasourceId, datasourceState);
        })
        .catch(onError);
    }
  });
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
  const datasourceStates: Record<string, { isLoading: boolean; state: unknown }> = {};

  await Promise.all(
    Object.entries(datasources).map(([datasourceId, datasource]) => {
      if (persistedDatasourceStates[datasourceId]) {
        return datasource
          .initialize(persistedDatasourceStates[datasourceId], references)
          .then((datasourceState) => {
            datasourceStates[datasourceId] = { isLoading: false, state: datasourceState };
          });
      }
    })
  );

  const datasourceLayers = createDatasourceLayers(datasources, datasourceStates);

  return buildExpression({
    visualization,
    visualizationState,
    datasourceMap: datasources,
    datasourceStates,
    datasourceLayers,
  });
}
