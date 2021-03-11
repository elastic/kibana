/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/public';
import { Ast } from '@kbn/interpreter/common';
import {
  Datasource,
  DatasourcePublicAPI,
  FramePublicAPI,
  InitializationOptions,
  Visualization,
  VisualizationDimensionGroupConfig,
} from '../../types';
import { buildExpression } from './expression_helpers';
import { Document } from '../../persistence/saved_object_store';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';
import { getActiveDatasourceIdFromDoc } from './state_management';
import { ErrorMessage } from '../types';
import {
  getMissingCurrentDatasource,
  getMissingIndexPatterns,
  getMissingVisualizationTypeError,
} from '../error_helper';

export async function initializeDatasources(
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>,
  references?: SavedObjectReference[],
  initialContext?: VisualizeFieldContext,
  options?: InitializationOptions
) {
  const states: Record<string, { isLoading: boolean; state: unknown }> = {};
  await Promise.all(
    Object.entries(datasourceMap).map(([datasourceId, datasource]) => {
      if (datasourceStates[datasourceId]) {
        return datasource
          .initialize(
            datasourceStates[datasourceId].state || undefined,
            references,
            initialContext,
            options
          )
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
): Promise<{ ast: Ast | null; errors: ErrorMessage[] | undefined }> {
  const {
    state: { visualization: visualizationState, datasourceStates: persistedDatasourceStates },
    visualizationType,
    references,
    title,
    description,
  } = doc;
  if (!visualizationType) {
    return {
      ast: null,
      errors: [{ shortMessage: '', longMessage: getMissingVisualizationTypeError() }],
    };
  }
  const visualization = visualizations[visualizationType!];
  const datasourceStates = await initializeDatasources(
    datasources,
    Object.fromEntries(
      Object.entries(persistedDatasourceStates).map(([id, state]) => [
        id,
        { isLoading: false, state },
      ])
    ),
    references,
    undefined,
    { isFullEditor: false }
  );

  const datasourceLayers = createDatasourceLayers(datasources, datasourceStates);

  const datasourceId = getActiveDatasourceIdFromDoc(doc);
  if (datasourceId == null) {
    return {
      ast: null,
      errors: [{ shortMessage: '', longMessage: getMissingCurrentDatasource() }],
    };
  }

  const indexPatternValidation = validateRequiredIndexPatterns(
    datasourceStates[datasourceId].state
  );

  if (indexPatternValidation) {
    return {
      ast: null,
      errors: indexPatternValidation,
    };
  }

  const validationResult = validateDatasourceAndVisualization(
    datasources[datasourceId],
    datasourceStates[datasourceId].state,
    visualization,
    visualizationState,
    { datasourceLayers }
  );

  return {
    ast: buildExpression({
      title,
      description,
      visualization,
      visualizationState,
      datasourceMap: datasources,
      datasourceStates,
      datasourceLayers,
    }),
    errors: validationResult,
  };
}

export function getMissingIndexPattern(
  currentDatasourceState:
    | {
        isLoading: boolean;
        state: unknown;
      }
    | null
    | string
) {
  if (currentDatasourceState == null || typeof currentDatasourceState === 'string') {
    return [];
  }
  const datasourceState =
    (currentDatasourceState.state as {
      layers: Record<string, { indexPatternId: string }>;
      indexPatterns: Record<string, unknown>;
    }) || {};

  const ids = Object.values(datasourceState.layers || {}).map(
    ({ indexPatternId }) => indexPatternId
  );
  return ids.filter((id) => !datasourceState.indexPatterns[id]);
}

const validateRequiredIndexPatterns = (
  currentDatasourceState: unknown | null
): ErrorMessage[] | undefined => {
  if (currentDatasourceState == null) {
    return;
  }
  const dataSourceState = currentDatasourceState as {
    currentIndexPatternId: string | null;
    layers: Record<string, { indexPatternId: string }>;
    indexPatterns: Record<string, unknown>;
  };

  const missingIds = Object.keys(dataSourceState.layers)
    .filter((layerId) => {
      const id = dataSourceState.layers[layerId].indexPatternId;
      return !dataSourceState.indexPatterns[id];
    })
    .map((layerId) => dataSourceState.layers[layerId].indexPatternId);
  if (missingIds.length) {
    return [
      { shortMessage: '', longMessage: getMissingIndexPatterns(missingIds), type: 'fixable' },
    ];
  }
};

export const validateDatasourceAndVisualization = (
  currentDataSource: Datasource | null,
  currentDatasourceState: unknown | null,
  currentVisualization: Visualization | null,
  currentVisualizationState: unknown | undefined,
  frameAPI: Pick<FramePublicAPI, 'datasourceLayers'>
): ErrorMessage[] | undefined => {
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
    ? currentVisualization?.getErrorMessages(currentVisualizationState, frameAPI.datasourceLayers)
    : undefined;

  if (datasourceValidationErrors?.length || visualizationValidationErrors?.length) {
    return [...(datasourceValidationErrors || []), ...(visualizationValidationErrors || [])];
  }
  return undefined;
};
