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
import {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { ISearchStart } from '@kbn/data-plugin/public';
import type { Document } from './persistence/saved_object_store';
import {
  Datasource,
  DatasourceMap,
  Visualization,
  IndexPatternMap,
  IndexPatternRef,
  DraggedField,
  DragDropOperation,
  isOperation,
  UserMessage,
} from './types';
import type { DatasourceStates, VisualizationState } from './state_management';
import type { IndexPatternServiceAPI } from './data_views_service/service';
import type { DraggingIdentifier } from './drag_drop';

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

export function getActiveVisualizationIdFromDoc(doc?: Document) {
  if (!doc) {
    return null;
  }
  return doc.visualizationType || null;
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
  indexPatternService.updateDataViewsState({
    indexPatterns: {
      ...indexPatternsCache,
      [indexPatternId]: indexPattern,
    },
  });
}

export function extractReferencesFromState({
  activeDatasources,
  datasourceStates,
  visualizationState,
  activeVisualization,
}: {
  activeDatasources: Record<string, Datasource>;
  datasourceStates: DatasourceStates;
  visualizationState: unknown;
  activeVisualization?: Visualization;
}): SavedObjectReference[] {
  const references: SavedObjectReference[] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { savedObjectReferences } = datasource.getPersistableState(datasourceStates[id].state);
    references.push(...savedObjectReferences);
  });

  if (activeVisualization?.getPersistableState) {
    const { savedObjectReferences } = activeVisualization.getPersistableState(visualizationState);
    references.push(...savedObjectReferences);
  }
  return references;
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
  const references: SavedObjectReference[] = extractReferencesFromState({
    activeDatasources,
    datasourceStates,
    visualizationState,
    activeVisualization,
  });

  const currentIndexPatternId: string | undefined = Object.entries(activeDatasources).reduce<
    string | undefined
  >((currentId, [id, datasource]) => {
    if (currentId == null) {
      return datasource.getUsedDataView(datasourceStates[id].state);
    }
    return currentId;
  }, undefined);
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
  context: BrushTriggerEvent['data'] | ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']
) {
  const tablesAndColumns =
    'table' in context
      ? [{ table: context.table, column: context.column }]
      : !context.negate
      ? context.data
      : // if it's a negated filter, never respect bound time field
        [];
  return !Array.isArray(tablesAndColumns)
    ? [tablesAndColumns]
    : tablesAndColumns
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

export function isDraggedField(fieldCandidate: unknown): fieldCandidate is DraggedField {
  return (
    typeof fieldCandidate === 'object' &&
    fieldCandidate !== null &&
    ['id', 'field'].every((prop) => prop in fieldCandidate)
  );
}

export function isDraggedDataViewField(fieldCandidate: unknown): fieldCandidate is DraggedField {
  return (
    typeof fieldCandidate === 'object' &&
    fieldCandidate !== null &&
    ['id', 'field', 'indexPatternId'].every((prop) => prop in fieldCandidate)
  );
}

export const isOperationFromCompatibleGroup = (
  op1?: DraggingIdentifier,
  op2?: DragDropOperation
) => {
  return (
    isOperation(op1) &&
    isOperation(op2) &&
    op1.columnId !== op2.columnId &&
    op1.groupId === op2.groupId &&
    op1.layerId !== op2.layerId
  );
};

export const isOperationFromTheSameGroup = (op1?: DraggingIdentifier, op2?: DragDropOperation) => {
  return (
    isOperation(op1) &&
    isOperation(op2) &&
    op1.columnId !== op2.columnId &&
    op1.groupId === op2.groupId &&
    op1.layerId === op2.layerId
  );
};

export const sortDataViewRefs = (dataViewRefs: IndexPatternRef[]) =>
  dataViewRefs.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });

export const getSearchWarningMessages = (
  adapter: RequestAdapter,
  datasource: Datasource,
  state: unknown,
  deps: {
    searchService: ISearchStart;
  }
): UserMessage[] => {
  const warningsMap: Map<string, UserMessage[]> = new Map();

  deps.searchService.showWarnings(adapter, (warning, meta) => {
    const { request, response, requestId } = meta;

    const warningMessages = datasource.getSearchWarningMessages?.(
      state,
      warning,
      request,
      response
    );

    if (warningMessages?.length) {
      const key = (requestId ?? '') + warning.type + warning.reason?.type ?? '';
      if (!warningsMap.has(key)) {
        warningsMap.set(key, warningMessages);
      }
      return true;
    }
    return false;
  });

  return [...warningsMap.values()].flat();
};
