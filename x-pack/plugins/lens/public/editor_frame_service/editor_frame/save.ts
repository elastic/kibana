/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { toExpression } from '@kbn/interpreter/target/common';
import { EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';
import { buildExpression } from './expression_helpers';
import { Datasource, Visualization, FramePublicAPI } from '../../types';

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
  const expression = buildExpression({
    visualization,
    visualizationState: state.visualization.state,
    datasourceMap: activeDatasources,
    datasourceStates: state.datasourceStates,
    framePublicAPI,
    removeDateRange: true,
  });

  const datasourceStates: Record<string, unknown> = {};
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    datasourceStates[id] = datasource.getPersistableState(state.datasourceStates[id].state);
  });

  const filterableIndexPatterns: Array<{ id: string; title: string }> = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    filterableIndexPatterns.push(
      ...datasource.getMetaData(state.datasourceStates[id].state).filterableIndexPatterns
    );
  });

  return {
    id: state.persistedId,
    title: state.title,
    description: state.description,
    type: 'lens',
    visualizationType: state.visualization.activeId,
    expression: expression ? toExpression(expression) : '',
    state: {
      datasourceStates,
      datasourceMetaData: {
        filterableIndexPatterns: _.uniqBy(filterableIndexPatterns, 'id'),
      },
      visualization: visualization.getPersistableState(state.visualization.state),
      query: framePublicAPI.query,
      filters: framePublicAPI.filters,
    },
  };
}
