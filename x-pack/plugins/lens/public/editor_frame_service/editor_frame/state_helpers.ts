/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/public';
import { Ast } from '@kbn/interpreter';
import memoizeOne from 'memoize-one';
import {
  Datasource,
  DatasourceLayers,
  DatasourceMap,
  FramePublicAPI,
  InitializationOptions,
  Visualization,
  VisualizationMap,
  VisualizeEditorContext,
} from '../../types';
import { buildExpression } from './expression_helpers';
import { Document } from '../../persistence/saved_object_store';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';
import { getActiveDatasourceIdFromDoc } from '../../utils';
import { ErrorMessage } from '../types';
import {
  getMissingCurrentDatasource,
  getMissingIndexPatterns,
  getMissingVisualizationTypeError,
  getUnknownVisualizationTypeError,
} from '../error_helper';
import { DatasourceStates } from '../../state_management';

export async function initializeDatasources(
  datasourceMap: DatasourceMap,
  datasourceStates: DatasourceStates,
  references?: SavedObjectReference[],
  initialContext?: VisualizeFieldContext | VisualizeEditorContext,
  options?: InitializationOptions
) {
  const states: DatasourceStates = {};
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

export const getDatasourceLayers = memoizeOne(function getDatasourceLayers(
  datasourceStates: DatasourceStates,
  datasourceMap: DatasourceMap
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
        });
      });
    });
  return datasourceLayers;
});

export async function persistedStateToExpression(
  datasourceMap: DatasourceMap,
  visualizations: VisualizationMap,
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
  if (!visualizations[visualizationType]) {
    return {
      ast: null,
      errors: [getUnknownVisualizationTypeError(visualizationType)],
    };
  }
  const visualization = visualizations[visualizationType!];
  const datasourceStates = await initializeDatasources(
    datasourceMap,
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

  const datasourceLayers = getDatasourceLayers(datasourceStates, datasourceMap);

  const datasourceId = getActiveDatasourceIdFromDoc(doc);
  if (datasourceId == null) {
    return {
      ast: null,
      errors: [{ shortMessage: '', longMessage: getMissingCurrentDatasource() }],
    };
  }

  const indexPatternValidation = validateRequiredIndexPatterns(
    datasourceMap[datasourceId],
    datasourceStates[datasourceId]
  );

  if (indexPatternValidation) {
    return {
      ast: null,
      errors: indexPatternValidation,
    };
  }

  const validationResult = validateDatasourceAndVisualization(
    datasourceMap[datasourceId],
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
      datasourceMap,
      datasourceStates,
      datasourceLayers,
    }),
    errors: validationResult,
  };
}

export function getMissingIndexPattern(
  currentDatasource: Datasource | null,
  currentDatasourceState: { state: unknown } | null
) {
  if (currentDatasourceState == null || currentDatasource == null) {
    return [];
  }
  const missingIds = currentDatasource.checkIntegrity(currentDatasourceState.state);
  if (!missingIds.length) {
    return [];
  }
  return missingIds;
}

const validateRequiredIndexPatterns = (
  currentDatasource: Datasource,
  currentDatasourceState: { state: unknown } | null
): ErrorMessage[] | undefined => {
  const missingIds = getMissingIndexPattern(currentDatasource, currentDatasourceState);

  if (!missingIds.length) {
    return;
  }

  return [{ shortMessage: '', longMessage: getMissingIndexPatterns(missingIds), type: 'fixable' }];
};

export const validateDatasourceAndVisualization = (
  currentDataSource: Datasource | null,
  currentDatasourceState: unknown | null,
  currentVisualization: Visualization | null,
  currentVisualizationState: unknown | undefined,
  frameAPI: Pick<FramePublicAPI, 'datasourceLayers'>
): ErrorMessage[] | undefined => {
  const datasourceValidationErrors = currentDatasourceState
    ? currentDataSource?.getErrorMessages(currentDatasourceState)
    : undefined;

  const visualizationValidationErrors = currentVisualizationState
    ? currentVisualization?.getErrorMessages(currentVisualizationState, frameAPI.datasourceLayers)
    : undefined;

  if (datasourceValidationErrors?.length || visualizationValidationErrors?.length) {
    return [...(datasourceValidationErrors || []), ...(visualizationValidationErrors || [])];
  }
  return undefined;
};
