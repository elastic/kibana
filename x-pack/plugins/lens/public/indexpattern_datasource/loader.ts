/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, mapValues, difference } from 'lodash';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { HttpSetup, SavedObjectReference } from '@kbn/core/public';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import { DataViewSpec, isNestedField } from '@kbn/data-views-plugin/common';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type {
  DatasourceDataPanelProps,
  InitializationOptions,
  VisualizeEditorContext,
} from '../types';
import {
  IndexPattern,
  IndexPatternRef,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternLayer,
} from './types';

import { updateLayerIndexPattern, translateToOperationName } from './operations';
import { DateRange, ExistingFields } from '../../common/types';
import { BASE_API_URL } from '../../common';
import { documentField } from './document_field';
import { readFromStorage, writeToStorage } from '../settings_storage';
import { getFieldByNameFactory } from './pure_helpers';
import { memoizedGetAvailableOperationsByMetadata } from './operations';

type SetState = DatasourceDataPanelProps<IndexPatternPrivateState>['setState'];
type IndexPatternsService = Pick<DataViewsContract, 'get' | 'getIdsWithTitle' | 'create'>;
type ErrorHandler = (err: Error) => void;

export function convertDataViewIntoLensIndexPattern(dataView: DataView): IndexPattern {
  const newFields = dataView.fields
    .filter((field) => !isNestedField(field) && (!!field.aggregatable || !!field.scripted))
    .map((field): IndexPatternField => {
      // Convert the getters on the index pattern service into plain JSON
      const base = {
        name: field.name,
        displayName: field.displayName,
        type: field.type,
        aggregatable: field.aggregatable,
        searchable: field.searchable,
        meta: dataView.metaFields.includes(field.name),
        esTypes: field.esTypes,
        scripted: field.scripted,
        runtime: Boolean(field.runtimeField),
      };

      // Simplifies tests by hiding optional properties instead of undefined
      return base.scripted
        ? {
            ...base,
            lang: field.lang,
            script: field.script,
          }
        : base;
    })
    .concat(documentField);

  const { typeMeta, title, name, timeFieldName, fieldFormatMap } = dataView;
  if (typeMeta?.aggs) {
    const aggs = Object.keys(typeMeta.aggs);
    newFields.forEach((field, index) => {
      const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
      aggs.forEach((agg) => {
        const restriction = typeMeta.aggs && typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name];
        if (restriction) {
          restrictionsObj[translateToOperationName(agg)] = restriction;
        }
      });
      if (Object.keys(restrictionsObj).length) {
        newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
      }
    });
  }

  return {
    id: dataView.id!, // id exists for sure because we got index patterns by id
    title,
    name: name ? name : title,
    timeFieldName,
    fieldFormatMap:
      fieldFormatMap &&
      Object.fromEntries(
        Object.entries(fieldFormatMap).map(([id, format]) => [
          id,
          'toJSON' in format ? format.toJSON() : format,
        ])
      ),
    fields: newFields,
    getFieldByName: getFieldByNameFactory(newFields),
    hasRestrictions: !!typeMeta?.aggs,
    spec: dataView.isPersisted() ? undefined : dataView.toSpec(false),
  };
}

export async function loadIndexPatterns({
  indexPatternsService,
  patterns,
  notUsedPatterns,
  cache,
}: {
  indexPatternsService: IndexPatternsService;
  patterns: Array<string | DataView>;
  notUsedPatterns?: string[];
  cache: Record<string, IndexPattern>;
}) {
  const missingIds = patterns.filter((id) => !cache[typeof id === 'string' ? id : id.id!]);

  if (missingIds.length === 0) {
    return cache;
  }

  if (memoizedGetAvailableOperationsByMetadata.cache.clear) {
    // clear operations meta data cache because index pattern reference may change
    memoizedGetAvailableOperationsByMetadata.cache.clear();
  }

  const allIndexPatterns = await Promise.allSettled(
    missingIds.map((id) => (typeof id === 'string' ? indexPatternsService.get(id) : id))
  );
  // ignore rejected indexpatterns here, they're already handled at the app level
  let indexPatterns = allIndexPatterns
    .filter(
      (response): response is PromiseFulfilledResult<DataView> => response.status === 'fulfilled'
    )
    .map((response) => response.value);

  // if all of the used index patterns failed to load, try loading one of not used ones till one succeeds
  for (let i = 0; notUsedPatterns && i < notUsedPatterns?.length && !indexPatterns.length; i++) {
    const resp = await indexPatternsService.get(notUsedPatterns[i]).catch((e) => {
      // do nothing
    });
    if (resp) {
      indexPatterns = [resp];
    }
  }

  const indexPatternsObject = indexPatterns.reduce(
    (acc, indexPattern) => ({
      [indexPattern.id!]: convertDataViewIntoLensIndexPattern(indexPattern),
      ...acc,
    }),
    { ...cache }
  );

  return indexPatternsObject;
}

const getLastUsedIndexPatternId = (
  storage: IStorageWrapper,
  indexPatternRefs: IndexPatternRef[]
) => {
  const indexPattern = readFromStorage(storage, 'indexPatternId');
  return indexPattern && indexPatternRefs.find((i) => i.id === indexPattern)?.id;
};

const setLastUsedIndexPatternId = (storage: IStorageWrapper, value: string) => {
  writeToStorage(storage, 'indexPatternId', value);
};

function getLayerReferenceName(layerId: string) {
  return `indexpattern-datasource-layer-${layerId}`;
}

export function extractReferences({ layers, indexPatterns }: IndexPatternPrivateState) {
  const savedObjectReferences: SavedObjectReference[] = [];
  const persistableState: IndexPatternPersistedState = {
    layers: {},
    adHocIndexPatterns: {},
  };
  Object.entries(layers).forEach(([layerId, { indexPatternId, ...persistableLayer }]) => {
    persistableState.layers[layerId] = persistableLayer;
    if (indexPatterns[indexPatternId].spec) {
      if (!persistableState.adHocIndexPatterns![indexPatternId]) {
        persistableState.adHocIndexPatterns![indexPatternId] = indexPatterns[indexPatternId].spec!;
      }
      persistableState.layers[layerId].adHocDataViewId = indexPatternId;
    } else {
      savedObjectReferences.push({
        type: 'index-pattern',
        id: indexPatternId,
        name: getLayerReferenceName(layerId),
      });
    }
  });
  return { savedObjectReferences, state: persistableState };
}

export function injectReferences(
  state: IndexPatternPersistedState,
  references: SavedObjectReference[]
) {
  const layers: Record<string, IndexPatternLayer> = {};
  Object.entries(state.layers).forEach(([layerId, persistedLayer]) => {
    layers[layerId] = {
      ...persistedLayer,
      indexPatternId:
        persistedLayer.adHocDataViewId ||
        references.find(({ name }) => name === getLayerReferenceName(layerId))!.id,
    };
  });
  return {
    layers,
  };
}

export async function loadInitialState({
  persistedState,
  references,
  defaultIndexPatternId,
  storage,
  indexPatternsService,
  initialContext,
  options,
}: {
  persistedState?: IndexPatternPersistedState;
  references?: SavedObjectReference[];
  defaultIndexPatternId?: string;
  storage: IStorageWrapper;
  indexPatternsService: IndexPatternsService;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  options?: InitializationOptions;
}): Promise<IndexPatternPrivateState> {
  const { isFullEditor } = options ?? {};
  const adHocDataViews: Record<string, DataView> = Object.fromEntries(
    await Promise.all(
      [
        ...Object.entries(persistedState?.adHocIndexPatterns || {}),
        ...(initialContext && !('isVisualizeAction' in initialContext)
          ? ([[initialContext.dataView.id!, initialContext.dataView]] as Array<
              [string, DataViewSpec]
            >)
          : []),
      ].map(async ([id, spec]) => {
        return [id, await indexPatternsService.create(spec)];
      })
    )
  );
  // make it explicit or TS will infer never[] and break few lines down
  const indexPatternRefs: IndexPatternRef[] = await (isFullEditor
    ? loadIndexPatternRefs(indexPatternsService)
    : []);

  Object.entries(adHocDataViews).forEach(([id, { name, title }]) => {
    indexPatternRefs.push({ id, name, title, adHoc: true });
  });

  const lastUsedIndexPatternId = getLastUsedIndexPatternId(storage, indexPatternRefs);
  const fallbackId = lastUsedIndexPatternId || defaultIndexPatternId || indexPatternRefs[0]?.id;
  const indexPatternIds = [];
  if (initialContext && 'isVisualizeAction' in initialContext) {
    for (let layerIdx = 0; layerIdx < initialContext.layers.length; layerIdx++) {
      const layerContext = initialContext.layers[layerIdx];
      indexPatternIds.push(layerContext.indexPatternId);
    }
  } else if (initialContext) {
    indexPatternIds.push(initialContext.dataView.id!);
  }
  const state =
    persistedState && references ? injectReferences(persistedState, references) : undefined;
  const usedPatterns = (
    initialContext
      ? indexPatternIds
      : uniq(
          state
            ? Object.values(state.layers).map((l) =>
                l.adHocDataViewId ? adHocDataViews[l.adHocDataViewId] : l.indexPatternId
              )
            : [fallbackId]
        )
  )
    // take out the undefined from the list
    .filter(Boolean);

  const notUsedPatterns: string[] = difference(
    uniq(indexPatternRefs.map(({ id }) => id)),
    usedPatterns.filter((p) => typeof p === 'string')
  );

  const availableIndexPatterns = new Set(indexPatternRefs.map(({ id }: IndexPatternRef) => id));

  const indexPatterns = await loadIndexPatterns({
    indexPatternsService,
    cache: {},
    patterns: usedPatterns,
    notUsedPatterns,
  });

  // Priority list:
  // * start with the indexPattern in context
  // * then fallback to the used ones
  // * then as last resort use a first one from not used refs
  const availableIndexPatternIds = [...indexPatternIds, ...usedPatterns, ...notUsedPatterns]
    .map((p) => (typeof p !== 'string' ? p.id : p))
    .filter((id) => id != null && availableIndexPatterns.has(id) && indexPatterns[id]);

  const currentIndexPatternId = availableIndexPatternIds[0];

  if (currentIndexPatternId) {
    setLastUsedIndexPatternId(storage, currentIndexPatternId);
  }

  return {
    layers: {},
    ...state,
    currentIndexPatternId,
    indexPatternRefs,
    indexPatterns,
    existingFields: {},
    isFirstExistenceFetch: true,
  };
}

export async function changeIndexPattern({
  id: idOrDataView,
  state,
  setState,
  onError,
  storage,
  indexPatternsService,
}: {
  id: string | DataView;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
  storage: IStorageWrapper;
  indexPatternsService: IndexPatternsService;
}) {
  const id = typeof idOrDataView === 'string' ? idOrDataView : idOrDataView.id!;
  const indexPatterns = await loadIndexPatterns({
    indexPatternsService,
    cache: state.indexPatterns,
    patterns: [idOrDataView],
  });

  if (indexPatterns[id] == null) {
    return onError(Error('Missing indexpatterns'));
  }

  const hasRefAlready = state.indexPatternRefs.some((r) => r.id === id);

  try {
    setState(
      (s) => ({
        ...s,
        layers: isSingleEmptyLayer(state.layers)
          ? mapValues(state.layers, (layer) => updateLayerIndexPattern(layer, indexPatterns[id]))
          : state.layers,
        indexPatterns: {
          ...s.indexPatterns,
          [id]: indexPatterns[id],
        },
        indexPatternRefs: hasRefAlready
          ? s.indexPatternRefs
          : [
              ...s.indexPatternRefs,
              {
                title: indexPatterns[id].title,
                name: indexPatterns[id].name,
                id,
                adHoc: typeof idOrDataView !== 'string' && !idOrDataView.isPersisted(),
              },
            ],
        currentIndexPatternId: id,
      }),
      { applyImmediately: true }
    );
    setLastUsedIndexPatternId(storage, id);
  } catch (err) {
    onError(err);
  }
}

export async function changeLayerIndexPattern({
  indexPatternId,
  layerId,
  state,
  setState,
  onError,
  replaceIfPossible,
  storage,
  indexPatternsService,
}: {
  indexPatternId: string;
  layerId: string;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
  replaceIfPossible?: boolean;
  storage: IStorageWrapper;
  indexPatternsService: IndexPatternsService;
}) {
  const indexPatterns = await loadIndexPatterns({
    indexPatternsService,
    cache: state.indexPatterns,
    patterns: [indexPatternId],
  });
  if (indexPatterns[indexPatternId] == null) {
    return onError(Error('Missing indexpatterns'));
  }

  try {
    setState((s) => ({
      ...s,
      layers: {
        ...s.layers,
        [layerId]: updateLayerIndexPattern(s.layers[layerId], indexPatterns[indexPatternId]),
      },
      indexPatterns: {
        ...s.indexPatterns,
        [indexPatternId]: indexPatterns[indexPatternId],
      },
      currentIndexPatternId: replaceIfPossible ? indexPatternId : s.currentIndexPatternId,
    }));
    setLastUsedIndexPatternId(storage, indexPatternId);
  } catch (err) {
    onError(err);
  }
}

async function loadIndexPatternRefs(
  indexPatternsService: IndexPatternsService
): Promise<IndexPatternRef[]> {
  const indexPatterns = await indexPatternsService.getIdsWithTitle();

  return indexPatterns.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });
}

export async function syncExistingFields({
  indexPatterns,
  dateRange,
  fetchJson,
  setState,
  isFirstExistenceFetch,
  currentIndexPatternTitle,
  dslQuery,
  showNoDataPopover,
}: {
  dateRange: DateRange;
  indexPatterns: Array<{
    id: string;
    title: string;
    fields: IndexPatternField[];
    timeFieldName?: string | null;
    hasRestrictions: boolean;
  }>;
  fetchJson: HttpSetup['post'];
  setState: SetState;
  isFirstExistenceFetch: boolean;
  currentIndexPatternTitle: string;
  dslQuery: object;
  showNoDataPopover: () => void;
}) {
  const existenceRequests = indexPatterns.map((pattern) => {
    if (pattern.hasRestrictions) {
      return {
        indexPatternTitle: pattern.title,
        existingFieldNames: pattern.fields.map((field) => field.name),
      };
    }
    const body: Record<string, string | object> = {
      dslQuery,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    };

    if (pattern.timeFieldName) {
      body.timeFieldName = pattern.timeFieldName;
    }

    return fetchJson(`${BASE_API_URL}/existing_fields/${pattern.id}`, {
      body: JSON.stringify(body),
    }) as Promise<ExistingFields>;
  });

  try {
    const emptinessInfo = await Promise.all(existenceRequests);
    if (isFirstExistenceFetch) {
      const fieldsCurrentIndexPattern = emptinessInfo.find(
        (info) => info.indexPatternTitle === currentIndexPatternTitle
      );
      if (fieldsCurrentIndexPattern && fieldsCurrentIndexPattern.existingFieldNames.length === 0) {
        showNoDataPopover();
      }
    }

    setState(
      (state) => ({
        ...state,
        isFirstExistenceFetch: false,
        existenceFetchFailed: false,
        existenceFetchTimeout: false,
        existingFields: emptinessInfo.reduce(
          (acc, info) => {
            acc[info.indexPatternTitle] = booleanMap(info.existingFieldNames);
            return acc;
          },
          { ...state.existingFields }
        ),
      }),
      { applyImmediately: true }
    );
  } catch (e) {
    // show all fields as available if fetch failed or timed out
    setState(
      (state) => ({
        ...state,
        existenceFetchFailed: e.res?.status !== 408,
        existenceFetchTimeout: e.res?.status === 408,
        existingFields: indexPatterns.reduce(
          (acc, pattern) => {
            acc[pattern.title] = booleanMap(pattern.fields.map((field) => field.name));
            return acc;
          },
          { ...state.existingFields }
        ),
      }),
      { applyImmediately: true }
    );
  }
}

function booleanMap(keys: string[]) {
  return keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<string, boolean>);
}

function isSingleEmptyLayer(layerMap: IndexPatternPrivateState['layers']) {
  const layers = Object.values(layerMap);
  return layers.length === 1 && layers[0].columnOrder.length === 0;
}
