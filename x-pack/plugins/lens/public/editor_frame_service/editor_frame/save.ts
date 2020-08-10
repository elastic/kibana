/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { toExpression } from '@kbn/interpreter/target/common';
import { EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';
import { Datasource, Visualization, FramePublicAPI } from '../../types';
import { SavedObjectReference } from 'kibana/public';

export interface Props {
  activeDatasources: Record<string, Datasource>;
  state: EditorFrameState;
  visualization: Visualization;
  framePublicAPI: FramePublicAPI;
}

export function getSavedObjectFormat({
  activeDatasources,
  state,
  visualization,
  framePublicAPI,
}: Props): Document {
  const datasourceStates: Record<string, unknown> = {};
  const references: SavedObjectReference[] = []
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(state.datasourceStates[id].state);
    datasourceStates[id] = persistableState;
    references.push(...savedObjectReferences);
  });

  const filterableIndexPatterns: Array<{ id: string; title: string }> = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    filterableIndexPatterns.push(
      ...datasource.getMetaData(state.datasourceStates[id].state).filterableIndexPatterns
    );
  });
  
  const { state: persistableVisualizationState, savedObjectReferences } = visualization.getPersistableState(state.visualization.state);
  references.push(...savedObjectReferences);
  
  const uniqueFilterableIndexPatternIds = _.uniqBy(filterableIndexPatterns, 'id').map(({ id }) => id);

  uniqueFilterableIndexPatternIds.forEach((id, index) => {
    references.push({ type: 'index-pattern', id, name: `filterable-index-pattern-${index}` });
  });

  return {
    id: state.persistedId,
    title: state.title,
    description: state.description,
    type: 'lens',
    visualizationType: state.visualization.activeId,
    state: {
      datasourceStates,
      datasourceMetaData: {
        filterableIndexPatterns: _.uniqBy(filterableIndexPatterns, 'id'),
      },
      visualization: persistableVisualizationState,
      query: framePublicAPI.query,
      filters: framePublicAPI.filters,
    },
    references,
  };
}
