/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';

import type { TimefilterContract } from 'src/plugins/data/public';
import type { IUiSettingsClient, SavedObjectReference } from 'kibana/public';
import type { DataView, DataViewsContract } from '../../../../src/plugins/data_views/public';
import type { Document } from './persistence/saved_object_store';
import type {
  Datasource,
  DatasourceMap,
  LensBrushEvent,
  LensFilterEvent,
  Visualization,
  StateSetter,
} from './types';
import { search } from '../../../../src/plugins/data/public';
import type { DatasourceStates, VisualizationState } from './state_management';

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

export function handleIndexPatternChange({
  activeDatasources,
  datasourceStates,
  indexPatternId,
  setDatasourceState,
}: {
  activeDatasources: Record<string, Datasource>;
  datasourceStates: DatasourceStates;
  indexPatternId: string;
  setDatasourceState: StateSetter<unknown>;
}): void {
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    datasource?.updateCurrentIndexPatternId?.({
      state: datasourceStates[id].state,
      indexPatternId,
      setState: setDatasourceState,
    });
  });
}

export function refreshIndexPatternsList({
  activeDatasources,
  indexPatternId,
  setDatasourceState,
}: {
  activeDatasources: Record<string, Datasource>;
  indexPatternId: string;
  setDatasourceState: StateSetter<unknown>;
}): void {
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    datasource?.refreshIndexPatternsList?.({
      indexPatternId,
      setState: setDatasourceState,
    });
  });
}

export function getIndexPatternsIds({
  activeDatasources,
  datasourceStates,
}: {
  activeDatasources: Record<string, Datasource>;
  datasourceStates: DatasourceStates;
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
  indexPatternsService: DataViewsContract
): Promise<{ indexPatterns: DataView[]; rejectedIds: string[] }> {
  const responses = await Promise.allSettled(ids.map((id) => indexPatternsService.get(id)));
  const fullfilled = responses.filter(
    (response): response is PromiseFulfilledResult<DataView> => response.status === 'fulfilled'
  );
  const rejectedIds = responses
    .map((_response, i) => ids[i])
    .filter((id, i) => responses[i].status === 'rejected');
  // return also the rejected ids in case we want to show something later on
  return { indexPatterns: fullfilled.map((response) => response.value), rejectedIds };
}

export function getRemoveOperation(
  activeVisualization: Visualization,
  visualizationState: VisualizationState['state'],
  layerId: string,
  layerCount: number
) {
  if (activeVisualization.getRemoveOperation) {
    return activeVisualization.getRemoveOperation(visualizationState, layerId);
  }
  // fallback to generic count check
  return layerCount === 1 ? 'clear' : 'remove';
}

export function inferTimeField(context: LensBrushEvent['data'] | LensFilterEvent['data']) {
  const tablesAndColumns =
    'table' in context
      ? [{ table: context.table, column: context.column }]
      : !context.negate
      ? context.data
      : // if it's a negated filter, never respect bound time field
        [];
  return tablesAndColumns
    .map(({ table, column }) => {
      const tableColumn = table.columns[column];
      const hasTimeRange = Boolean(
        tableColumn && search.aggs.getDateHistogramMetaDataByDatatableColumn(tableColumn)?.timeRange
      );
      if (hasTimeRange) {
        return tableColumn.meta.field;
      }
    })
    .find(Boolean);
}
