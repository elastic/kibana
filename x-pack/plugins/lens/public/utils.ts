/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternsContract, TimefilterContract } from 'src/plugins/data/public';
import { IUiSettingsClient } from 'kibana/public';
import moment from 'moment-timezone';
import { SavedObjectReference } from 'kibana/public';
import { Filter, Query } from 'src/plugins/data/public';
import { uniq } from 'lodash';
import { Document } from './persistence/saved_object_store';
import { Datasource, DatasourceMap } from './types';
import { extractFilterReferences } from './persistence';

export function getVisualizeGeoFieldMessage(fieldType: string) {
  return i18n.translate('xpack.lens.visualizeGeoFieldMessage', {
    defaultMessage: `Lens cannot visualize {fieldType} fields`,
    values: { fieldType },
  });
}

export const getResolvedDateRange = function (timefilter: TimefilterContract) {
  const { from, to } = timefilter.getTime();
  const { min, max } = timefilter.calculateBounds({
    from,
    to,
  });
  return { fromDate: min?.toISOString() || from, toDate: max?.toISOString() || to };
};

export function containsDynamicMath(dateMathString: string) {
  return dateMathString.includes('now');
}

export const TIME_LAG_PERCENTAGE_LIMIT = 0.02;

export function getTimeZone(uiSettings: IUiSettingsClient) {
  const configuredTimeZone = uiSettings.get('dateFormat:tz');
  if (configuredTimeZone === 'Browser') {
    return moment.tz.guess();
  }

  return configuredTimeZone;
}
export function getActiveDatasourceIdFromDoc(doc?: Document) {
  if (!doc) {
    return null;
  }

  const [firstDatasourceFromDoc] = Object.keys(doc.state.datasourceStates);
  return firstDatasourceFromDoc || null;
}

export const getInitialDatasourceId = (datasourceMap: DatasourceMap, doc?: Document) => {
  return (doc && getActiveDatasourceIdFromDoc(doc)) || Object.keys(datasourceMap)[0] || null;
};

export interface GetIndexPatternsObjects {
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

export function getSavedObjectFormat({
  activeDatasources,
  datasourceStates,
  visualization,
  filters,
  query,
  title,
  description,
  persistedId,
}: GetIndexPatternsObjects): Document {
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

export function getIndexPatternsIds({
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

export async function getIndexPatternsObjects(
  ids: string[],
  indexPatternsService: IndexPatternsContract
): Promise<{ indexPatterns: IndexPattern[]; rejectedIds: string[] }> {
  const responses = await Promise.allSettled(ids.map((id) => indexPatternsService.get(id)));
  const fullfilled = responses.filter(
    (response): response is PromiseFulfilledResult<IndexPattern> => response.status === 'fulfilled'
  );
  const rejectedIds = responses
    .map((_response, i) => ids[i])
    .filter((id, i) => responses[i].status === 'rejected');
  // return also the rejected ids in case we want to show something later on
  return { indexPatterns: fullfilled.map((response) => response.value), rejectedIds };
}
