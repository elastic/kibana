/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationMap, DatasourceMap } from '../../types';
import { getActiveVisualizationIdFromDoc, extractReferencesFromState } from '../../utils';
import type { TypedLensSerializedState } from '../types';

export function getStateManagementForInlineEditing(
  activeDatasourceId: string,
  getAttributes: () => TypedLensSerializedState['attributes'],
  updateAttributes: (
    newAttributes: TypedLensSerializedState['attributes'],
    resetId?: boolean
  ) => void,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap
) {
  // TODO: unify this with the main editor logic
  const updatePanelState = (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) => {
    const viz = getAttributes();

    const activeVisualizationId = getActiveVisualizationIdFromDoc(viz);
    if (viz?.state) {
      const datasourceStates = {
        ...viz.state.datasourceStates,
        [activeDatasourceId]: datasourceState,
      };
      const references = extractReferencesFromState({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        datasourceStates: Object.fromEntries(
          Object.entries(datasourceStates).map(([id, state]) => [id, { isLoading: false, state }])
        ),
        visualizationState,
        activeVisualization: activeVisualizationId
          ? visualizationMap[visualizationType ?? activeVisualizationId]
          : undefined,
      });
      const attrs = {
        ...viz,
        state: {
          ...viz.state,
          visualization: visualizationState,
          datasourceStates,
        },
        references,
        visualizationType: visualizationType ?? viz.visualizationType,
      };

      updateAttributes(attrs, true);
    }
  };

  const updateSuggestion = updateAttributes;

  return { updateSuggestion, updatePanelState };
}
