/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { StateSetter } from '../types';
import {
  IndexPattern,
  IndexPatternRef,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
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
      const newFields = (indexPattern.fields as IndexPatternField[])
        .filter(
          (field) =>
            !indexPatternsUtils.isNestedField(field) && (!!field.aggregatable || !!field.scripted)
        )
        .concat(documentField);

      const { typeMeta } = indexPattern;
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

      const currentIndexPattern = {
        ...indexPattern,
        fields: newFields,
      } as IndexPattern;

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

export async function loadInitialState({
  state,
  savedObjectsClient,
  defaultIndexPatternId,
  storage,
  indexPatternsService,
}: {
  state?: IndexPatternPersistedState;
  savedObjectsClient: SavedObjectsClient;
  defaultIndexPatternId?: string;
  storage: IStorageWrapper;
  indexPatternsService: IndexPatternsService;
}): Promise<IndexPatternPrivateState> {
  const indexPatternRefs = await loadIndexPatternRefs(savedObjectsClient);
  const lastUsedIndexPatternId = getLastUsedIndexPatternId(storage, indexPatternRefs);

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
  }>;
  fetchJson: HttpSetup['post'];
  setState: SetState;
  isFirstExistenceFetch: boolean;
  currentIndexPatternTitle: string;
  dslQuery: object;
  showNoDataPopover: () => void;
}) {
  const existenceRequests = indexPatterns.map((pattern) => {
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
