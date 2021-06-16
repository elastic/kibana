/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { SavedObjectReference } from 'kibana/public';
import { Document } from '../../persistence/saved_object_store';
import { Datasource, Visualization, FramePublicAPI } from '../../types';
import { extractFilterReferences } from '../../persistence';
import { buildExpression } from './expression_helpers';
import { PreviewState } from '../../state_management';

export interface Props {
  activeDatasources: Record<string, Datasource>;
  state: PreviewState;
  visualization: Visualization;
  framePublicAPI: FramePublicAPI;
  title: string;
  description?: string;
  persistedId?: string;
}

export function getSavedObjectFormat({
  activeDatasources,
  state,
  visualization,
  framePublicAPI,
  title,
  description,
  persistedId,
}: Props): {
  doc: Document;
  filterableIndexPatterns: string[];
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

  const uniqueFilterableIndexPatternIds = uniq(
    references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id)
  );

  const { persistableFilters, references: filterReferences } = extractFilterReferences(
    framePublicAPI.filters
  );

  references.push(...filterReferences);
  const expression = buildExpression({
    visualization,
    visualizationState: state.visualization.state,
    datasourceMap: activeDatasources,
    datasourceStates: state.datasourceStates,
    datasourceLayers: framePublicAPI.datasourceLayers,
  });

  return {
    doc: {
      savedObjectId: persistedId,
      title,
      description,
      type: 'lens',
      visualizationType: state.visualization.activeId,
      state: {
        datasourceStates,
        visualization: state.visualization.state,
        query: framePublicAPI.query,
        filters: persistableFilters,
      },
      references,
    },
    filterableIndexPatterns: uniqueFilterableIndexPatternIds,
    isSaveable: expression !== null,
  };
}
