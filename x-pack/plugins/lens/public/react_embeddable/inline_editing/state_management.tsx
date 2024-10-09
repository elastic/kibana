/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import { mergeToNewDoc } from '../../state_management/shared_logic';
import type { DatasourceStates } from '../../state_management/types';
import type { VisualizationMap, DatasourceMap } from '../../types';
import type { TypedLensSerializedState } from '../types';

export function getStateManagementForInlineEditing(
  activeDatasourceId: 'formBased' | 'textBased',
  getAttributes: () => TypedLensSerializedState['attributes'],
  updateAttributes: (
    newAttributes: TypedLensSerializedState['attributes'],
    resetId?: boolean
  ) => void,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap,
  extractFilterReferences: FilterManager['extract']
) {
  const updatePanelState = (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) => {
    const viz = getAttributes();
    const datasourceStates: DatasourceStates = {
      [activeDatasourceId]: {
        isLoading: false,
        state: datasourceState,
      },
    };
    const newViz = mergeToNewDoc(
      viz,
      {
        activeId: visualizationType || viz.visualizationType,
        state: visualizationState,
      },
      datasourceStates,
      viz.state.query,
      viz.state.filters,
      activeDatasourceId,
      viz.state.adHocDataViews || {},
      { visualizationMap, datasourceMap, extractFilterReferences }
    );
    const newDoc = {
      ...viz,
      ...newViz,
    };

    if (newDoc.state) {
      updateAttributes(newDoc, true);
    }
  };

  const updateSuggestion = updateAttributes;

  return { updateSuggestion, updatePanelState };
}
