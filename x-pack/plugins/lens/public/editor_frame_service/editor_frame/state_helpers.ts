/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectReference } from 'kibana/public';
import { Ast } from '@kbn/interpreter/common';
import {
  Datasource,
  DatasourcePublicAPI,
  FramePublicAPI,
  Visualization,
  VisualizationDimensionGroupConfig,
} from '../../types';
import { buildExpression } from './expression_helpers';
import { Document } from '../../persistence/saved_object_store';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';

export async function initializeDatasources(
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>,
  references?: SavedObjectReference[],
  initialContext?: VisualizeFieldContext
) {
  const states: Record<string, { isLoading: boolean; state: unknown }> = {};
  await Promise.all(
    Object.entries(datasourceMap).map(([datasourceId, datasource]) => {
      if (datasourceStates[datasourceId]) {
        return datasource
          .initialize(datasourceStates[datasourceId].state || undefined, references, initialContext)
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
  datasources: Record<string, Datasource>,
  visualizations: Record<string, Visualization>,
  doc: Document
): Promise<Ast | null> {
  const {
    state: { visualization: visualizationState, datasourceStates: persistedDatasourceStates },
    visualizationType,
    references,
    title,
    description,
  } = doc;
  if (!visualizationType) return null;
  const visualization = visualizations[visualizationType!];
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
    title,
    description,
    visualization,
    visualizationState,
    datasourceMap: datasources,
    datasourceStates,
    datasourceLayers,
  });
}

export const validateDatasourceAndVisualization = (
  currentDataSource: Datasource | null,
  currentDatasourceState: unknown | null,
  currentVisualization: Visualization | null,
  currentVisualizationState: unknown | undefined,
  frameAPI: FramePublicAPI
):
  | Array<{
      shortMessage: string;
      longMessage: string;
    }>
  | undefined => {
  const layersGroups = currentVisualizationState
    ? currentVisualization
        ?.getLayerIds(currentVisualizationState)
        .reduce<Record<string, VisualizationDimensionGroupConfig[]>>((memo, layerId) => {
          const groups = currentVisualization?.getConfiguration({
            frame: frameAPI,
            layerId,
            state: currentVisualizationState,
          }).groups;
          if (groups) {
            memo[layerId] = groups;
          }
          return memo;
        }, {})
    : undefined;

  const datasourceValidationErrors = currentDatasourceState
    ? currentDataSource?.getErrorMessages(currentDatasourceState, layersGroups)
    : undefined;

  const visualizationValidationErrors = currentVisualizationState
    ? currentVisualization?.getErrorMessages(currentVisualizationState, frameAPI)
    : undefined;

  if (datasourceValidationErrors || visualizationValidationErrors) {
    return [...(datasourceValidationErrors || []), ...(visualizationValidationErrors || [])];
  }
  return undefined;
};
