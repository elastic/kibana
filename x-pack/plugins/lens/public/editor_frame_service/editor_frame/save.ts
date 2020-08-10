/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SavedObjectReference } from 'kibana/public';
import { EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';
import { Datasource, Visualization, FramePublicAPI, DatasourceMetaData } from '../../types';
import { extractFilterReferences } from '../../persistence';
import { buildExpression } from './expression_helpers';

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
}: Props): {
  doc: Document;
  filterableIndexPatterns: DatasourceMetaData['filterableIndexPatterns'];
  isSaveable: boolean;
} {
  const datasourceStates: Record<string, unknown> = {};
  const references: SavedObjectReference[] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(
      state.datasourceStates[id].state
    );
    datasourceStates[id] = persistableState;
    references.push(...savedObjectReferences);
  });

  const filterableIndexPatterns: Array<{ id: string; title: string }> = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    filterableIndexPatterns.push(
      ...datasource.getMetaData(state.datasourceStates[id].state).filterableIndexPatterns
    );
  });

  const {
    state: persistableVisualizationState,
    savedObjectReferences,
  } = visualization.getPersistableState(state.visualization.state);
  references.push(...savedObjectReferences);

  const uniqueFilterableIndexPatternIds = _.uniqBy(filterableIndexPatterns, 'id').map(
    ({ id }) => id
  );

  uniqueFilterableIndexPatternIds.forEach((id, index) => {
    references.push({ type: 'index-pattern', id, name: `filterable-index-pattern-${index}` });
  });

  const { persistableFilters, references: filterReferences } = extractFilterReferences(
    framePublicAPI.filters
  );

  references.push(...filterReferences);

  const expression = buildExpression({
    visualization,
    visualizationState: state.visualization.state,
    datasourceMap: activeDatasources,
    datasourceStates: state.datasourceStates,
    framePublicAPI,
    removeDateRange: true,
  });

  return {
    doc: {
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
        filters: persistableFilters,
      },
      references,
    },
    filterableIndexPatterns,
    isSaveable: expression !== null,
  };
}
