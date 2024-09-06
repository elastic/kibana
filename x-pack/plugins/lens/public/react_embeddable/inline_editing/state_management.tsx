/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { mergeToNewDoc } from '../../state_management/shared_logic';
import { DatasourceStates, VisualizationState } from '../../state_management/types';
import type { VisualizationMap, DatasourceMap } from '../../types';
import type { TypedLensSerializedState } from '../types';

export function getStateManagementForInlineEditing(
  activeDatasourceId: string,
  getAttributes: () => TypedLensSerializedState['attributes'],
  updateAttributes: (
    newAttributes: TypedLensSerializedState['attributes'],
    resetId?: boolean
  ) => void,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap,
  extractFilterReferences: FilterManager['extract']
) {
  const updatePanelState = (datasourceState: unknown, visualizationState: unknown) => {
    const viz = getAttributes();
    const newDoc = {
      ...viz,
      ...mergeToNewDoc(
        viz,
        visualizationState as VisualizationState,
        datasourceState as DatasourceStates,
        viz.state.query,
        viz.state.filters,
        activeDatasourceId,
        viz.state.adHocDataViews || {},
        { visualizationMap, datasourceMap, extractFilterReferences }
      ),
    };

    if (newDoc.state) {
      updateAttributes(newDoc, true);
    }
  };

  const updateSuggestion = updateAttributes;

  return { updateSuggestion, updatePanelState };
}
