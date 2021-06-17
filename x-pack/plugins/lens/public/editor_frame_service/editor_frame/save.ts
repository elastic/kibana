/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { SavedObjectReference } from 'kibana/public';
import { Filter, Query } from 'src/plugins/data/public';
import { Document } from '../../persistence/saved_object_store';
import { Datasource } from '../../types';
import { extractFilterReferences } from '../../persistence';

export interface Props {
  activeDatasources: Record<string, Datasource>;
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>;
  visualization: {
    activeId: string | null;
    state: unknown;
  };
  filters: Filter[];
  query: Query;
  title: string;
  description?: string;
  persistedId?: string;
}

export function getIndexPatterns({
  activeDatasources,
  datasourceStates,
}: {
  activeDatasources: Record<string, Datasource>;
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>;
}): string[] {
  const references: SavedObjectReference[] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { savedObjectReferences } = datasource.getPersistableState(datasourceStates[id].state);
    references.push(...savedObjectReferences);
  });

  const uniqueFilterableIndexPatternIds = uniq(
    references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id)
  );

  return uniqueFilterableIndexPatternIds;
}

export function getSavedObjectFormat({
  activeDatasources,
  datasourceStates,
  visualization,
  filters,
  query,
  title,
  description,
  persistedId,
}: Props): Document {
  const persistibleDatasourceStates: Record<string, unknown> = {};
  const references: SavedObjectReference[] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(
      datasourceStates[id].state
    );
    persistibleDatasourceStates[id] = persistableState;
    references.push(...savedObjectReferences);
  });

  const { persistableFilters, references: filterReferences } = extractFilterReferences(filters);

  references.push(...filterReferences);

  return {
    savedObjectId: persistedId,
    title,
    description,
    type: 'lens',
    visualizationType: visualization.activeId,
    state: {
      datasourceStates: persistibleDatasourceStates,
      visualization: visualization.state,
      query,
      filters: persistableFilters,
    },
    references,
  };
}
