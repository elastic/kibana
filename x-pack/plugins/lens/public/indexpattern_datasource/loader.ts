/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { SavedObjectsClientContract, HttpSetup, SavedObjectReference } from 'kibana/public';
import { StateSetter } from '../types';
import {
  IndexPattern,
  IndexPatternRef,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
  IndexPatternLayer,
} from './types';
import { updateLayerIndexPattern } from './state_helpers';
import { DateRange, ExistingFields } from '../../common/types';
import { BASE_API_URL } from '../../common';
import {
  IndexPatternsContract,
  indexPatterns as indexPatternsUtils,
} from '../../../../../src/plugins/data/public';
import { documentField } from './document_field';
import { readFromStorage, writeToStorage } from '../settings_storage';

type SetState = StateSetter<IndexPatternPrivateState>;
type SavedObjectsClient = Pick<SavedObjectsClientContract, 'find'>;
type IndexPatternsService = Pick<IndexPatternsContract, 'get'>;
type ErrorHandler = (err: Error) => void;

export async function loadIndexPatterns({
  indexPatternsService,
  patterns,
  cache,
}: {
  indexPatternsService: IndexPatternsService;
  patterns: string[];
  cache: Record<string, IndexPattern>;
}) {
  const missingIds = patterns.filter((id) => !cache[id]);

  if (missingIds.length === 0) {
    return cache;
  }

  const indexPatterns = await Promise.all(missingIds.map((id) => indexPatternsService.get(id)));
  const indexPatternsObject = indexPatterns.reduce(
    (acc, indexPattern) => {
      const newFields = indexPattern.fields
        .filter(
          (field) =>
            !indexPatternsUtils.isNestedField(field) && (!!field.aggregatable || !!field.scripted)
        )
        .map(
          (field): IndexPatternField => ({
            name: field.name,
            displayName: field.displayName,
            type: field.type,
            aggregatable: field.aggregatable,
            searchable: field.searchable,
            scripted: field.scripted,
            esTypes: field.esTypes,
          })
        )
        .concat(documentField);

      const { typeMeta, title, timeFieldName, fieldFormatMap } = indexPattern;
      if (typeMeta?.aggs) {
        const aggs = Object.keys(typeMeta.aggs);
        newFields.forEach((field, index) => {
          const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
          aggs.forEach((agg) => {
            const restriction =
              typeMeta.aggs && typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name];
            if (restriction) {
              restrictionsObj[agg] = restriction;
            }
          });
          if (Object.keys(restrictionsObj).length) {
            newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
          }
        });
      }

      const currentIndexPattern: IndexPattern = {
        id: indexPattern.id!, // id exists for sure because we got index patterns by id
        title,
        timeFieldName,
        fieldFormatMap,
        fields: newFields,
        hasRestrictions: !!typeMeta?.aggs,
      };

      return {
        [currentIndexPattern.id]: currentIndexPattern,
        ...acc,
      };
    },
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

const CURRENT_PATTERN_REFERENCE_NAME = 'indexpattern-datasource-current-indexpattern';
function getLayerReferenceName(layerId: string) {
  return `indexpattern-datasource-layer-${layerId}`;
}

export function extractReferences({ currentIndexPatternId, layers }: IndexPatternPrivateState) {
  const savedObjectReferences: SavedObjectReference[] = [];
  savedObjectReferences.push({
    type: 'index-pattern',
    id: currentIndexPatternId,
    name: CURRENT_PATTERN_REFERENCE_NAME,
  });
  const persistableLayers: Record<string, Omit<IndexPatternLayer, 'indexPatternId'>> = {};
  Object.entries(layers).forEach(([layerId, { indexPatternId, ...persistableLayer }]) => {
    savedObjectReferences.push({
      type: 'index-pattern',
      id: indexPatternId,
      name: getLayerReferenceName(layerId),
    });
    persistableLayers[layerId] = persistableLayer;
  });
  return { savedObjectReferences, state: { layers: persistableLayers } };
}

export function injectReferences(
  state: IndexPatternPersistedState,
  references: SavedObjectReference[]
) {
  const layers: Record<string, IndexPatternLayer> = {};
  Object.entries(state.layers).forEach(([layerId, persistedLayer]) => {
    layers[layerId] = {
      ...persistedLayer,
      indexPatternId: references.find(({ name }) => name === getLayerReferenceName(layerId))!.id,
    };
  });
  return {
    currentIndexPatternId: references.find(({ name }) => name === CURRENT_PATTERN_REFERENCE_NAME)!
      .id,
    layers,
  };
}

export async function loadInitialState({
  persistedState,
  references,
  savedObjectsClient,
  defaultIndexPatternId,
  storage,
  indexPatternsService,
}: {
  persistedState?: IndexPatternPersistedState;
  references?: SavedObjectReference[];
  savedObjectsClient: SavedObjectsClient;
  defaultIndexPatternId?: string;
  storage: IStorageWrapper;
  indexPatternsService: IndexPatternsService;
}): Promise<IndexPatternPrivateState> {
  const indexPatternRefs = await loadIndexPatternRefs(savedObjectsClient);
  const lastUsedIndexPatternId = getLastUsedIndexPatternId(storage, indexPatternRefs);

  const state =
    persistedState && references ? injectReferences(persistedState, references) : undefined;

  const requiredPatterns = _.uniq(
    state
      ? Object.values(state.layers)
          .map((l) => l.indexPatternId)
          .concat(state.currentIndexPatternId)
      : [lastUsedIndexPatternId || defaultIndexPatternId || indexPatternRefs[0].id]
  );

  const currentIndexPatternId = requiredPatterns[0];
  setLastUsedIndexPatternId(storage, currentIndexPatternId);

  const indexPatterns = await loadIndexPatterns({
    indexPatternsService,
    cache: {},
    patterns: requiredPatterns,
  });
  if (state) {
    return {
      ...state,
      currentIndexPatternId,
      indexPatternRefs,
      indexPatterns,
      existingFields: {},
      isFirstExistenceFetch: true,
    };
  }

  return {
    currentIndexPatternId,
    indexPatternRefs,
    indexPatterns,
    layers: {},
    existingFields: {},
    isFirstExistenceFetch: true,
  };
}

export async function changeIndexPattern({
  id,
  state,
  setState,
  onError,
  storage,
  indexPatternsService,
}: {
  id: string;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
  storage: IStorageWrapper;
  indexPatternsService: IndexPatternsService;
}) {
  try {
    const indexPatterns = await loadIndexPatterns({
      indexPatternsService,
      cache: state.indexPatterns,
      patterns: [id],
    });

    setState((s) => ({
      ...s,
      layers: isSingleEmptyLayer(state.layers)
        ? _.mapValues(state.layers, (layer) => updateLayerIndexPattern(layer, indexPatterns[id]))
        : state.layers,
      indexPatterns: {
        ...s.indexPatterns,
        [id]: indexPatterns[id],
      },
      currentIndexPatternId: id,
    }));
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
  try {
    const indexPatterns = await loadIndexPatterns({
      indexPatternsService,
      cache: state.indexPatterns,
      patterns: [indexPatternId],
    });

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
  savedObjectsClient: SavedObjectsClient
): Promise<IndexPatternRef[]> {
  const result = await savedObjectsClient.find<{ title: string }>({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });

  return result.savedObjects
    .map((o) => ({
      id: String(o.id),
      title: (o.attributes as { title: string }).title,
    }))
    .sort((a, b) => {
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

    setState((state) => ({
      ...state,
      isFirstExistenceFetch: false,
      existenceFetchFailed: false,
      existingFields: emptinessInfo.reduce((acc, info) => {
        acc[info.indexPatternTitle] = booleanMap(info.existingFieldNames);
        return acc;
      }, state.existingFields),
    }));
  } catch (e) {
    // show all fields as available if fetch failed
    setState((state) => ({
      ...state,
      existenceFetchFailed: true,
      existingFields: indexPatterns.reduce((acc, pattern) => {
        acc[pattern.title] = booleanMap(pattern.fields.map((field) => field.name));
        return acc;
      }, state.existingFields),
    }));
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
