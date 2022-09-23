/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set, uniq, cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import type { Serializable } from '@kbn/utility-types';

import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { IUiSettingsClient, SavedObjectReference } from '@kbn/core/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { BrushTriggerEvent, ClickTriggerEvent } from '@kbn/charts-plugin/public';
import type { Document } from './persistence/saved_object_store';
import type {
  Datasource,
  DatasourceMap,
  Visualization,
  IndexPatternMap,
  IndexPatternRef,
} from './types';
import type { DatasourceStates, VisualizationState } from './state_management';
import { IndexPatternServiceAPI } from './data_views_service/service';

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

export function getInitialDataViewsObject(
  indexPatterns: IndexPatternMap,
  indexPatternRefs: IndexPatternRef[]
) {
  return {
    indexPatterns,
    indexPatternRefs,
    existingFields: {},
    isFirstExistenceFetch: true,
  };
}

export async function refreshIndexPatternsList({
  activeDatasources,
  indexPatternService,
  indexPatternId,
  indexPatternsCache,
}: {
  indexPatternService: IndexPatternServiceAPI;
  activeDatasources: Record<string, Datasource>;
  indexPatternId: string;
  indexPatternsCache: IndexPatternMap;
}) {
  // collect all the onRefreshIndex callbacks from datasources
  const onRefreshCallbacks = Object.values(activeDatasources)
    .map((datasource) => datasource?.onRefreshIndexPattern)
    .filter(Boolean);

  const newlyMappedIndexPattern = await indexPatternService.loadIndexPatterns({
    cache: {},
    patterns: [indexPatternId],
    onIndexPatternRefresh: () => onRefreshCallbacks.forEach((fn) => fn()),
  });
  const indexPattern = newlyMappedIndexPattern[indexPatternId];
  // But what about existingFields here?
  // When the indexPatterns cache object gets updated, the data panel will
  // notice it and refetch the fields list existence map
  indexPatternService.updateDataViewsState({
    indexPatterns: {
      ...indexPatternsCache,
      [indexPatternId]: indexPattern,
    },
  });
}

export function getIndexPatternsIds({
  activeDatasources,
  datasourceStates,
  visualizationState,
  activeVisualization,
}: {
  activeDatasources: Record<string, Datasource>;
  datasourceStates: DatasourceStates;
  visualizationState: unknown;
  activeVisualization?: Visualization;
}): string[] {
  let currentIndexPatternId: string | undefined;
  const references: SavedObjectReference[] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { savedObjectReferences } = datasource.getPersistableState(datasourceStates[id].state);
    const indexPatternId = datasource.getCurrentIndexPatternId(datasourceStates[id].state);
    currentIndexPatternId = indexPatternId;
    references.push(...savedObjectReferences);
  });

  if (activeVisualization?.getPersistableState) {
    const { savedObjectReferences } = activeVisualization.getPersistableState(visualizationState);
    references.push(...savedObjectReferences);
  }
  const referencesIds = references
    .filter(({ type }) => type === 'index-pattern')
    .map(({ id }) => id);
  if (currentIndexPatternId) {
    referencesIds.unshift(currentIndexPatternId);
  }
  return uniq(referencesIds);
}

export async function getIndexPatternsObjects(
  ids: string[],
  dataViews: DataViewsContract
): Promise<{ indexPatterns: DataView[]; rejectedIds: string[] }> {
  const responses = await Promise.allSettled(ids.map((id) => dataViews.get(id)));
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

export function inferTimeField(
  datatableUtilities: DatatableUtilitiesService,
  context: BrushTriggerEvent['data'] | ClickTriggerEvent['data']
) {
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
        tableColumn && datatableUtilities.getDateHistogramMeta(tableColumn)?.timeRange
      );
      if (hasTimeRange) {
        return tableColumn.meta.field;
      }
    })
    .find(Boolean);
}

export function renewIDs<T = unknown>(
  obj: T,
  forRenewIds: string[],
  getNewId: (id: string) => string | undefined
): T {
  obj = cloneDeep(obj);
  const recursiveFn = (
    item: Serializable,
    parent?: Record<string, Serializable> | Serializable[],
    key?: string | number
  ) => {
    if (typeof item === 'object') {
      if (Array.isArray(item)) {
        item.forEach((a, k, ref) => recursiveFn(a, ref, k));
      } else {
        if (item) {
          Object.keys(item).forEach((k) => {
            let newId = k;
            if (forRenewIds.includes(k)) {
              newId = getNewId(k) ?? k;
              item[newId] = item[k];
              delete item[k];
            }
            recursiveFn(item[newId], item, newId);
          });
        }
      }
    } else if (
      parent &&
      key !== undefined &&
      typeof item === 'string' &&
      forRenewIds.includes(item)
    ) {
      set(parent, key, getNewId(item) ?? item);
    }
  };
  recursiveFn(obj as unknown as Serializable);
  return obj;
}

/**
 * The dimension container is set up to close when it detects a click outside it.
 * Use this CSS class to exclude particular elements from this behavior.
 */
export const DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS =
  'lensDontCloseDimensionContainerOnClick';
