/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { SavedObjectsClientContract, SavedObjectAttributes, HttpSetup } from 'kibana/public';
import { SimpleSavedObject } from 'kibana/public';
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
import { documentField } from './document_field';
import {
  indexPatterns as indexPatternsUtils,
  IFieldType,
  IndexPatternTypeMeta,
} from '../../../../../src/plugins/data/public';
import { readFromStorage, writeToStorage } from '../settings_storage';

interface SavedIndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
  typeMeta: string;
}

type SetState = StateSetter<IndexPatternPrivateState>;
type SavedObjectsClient = Pick<SavedObjectsClientContract, 'find' | 'bulkGet'>;
type ErrorHandler = (err: Error) => void;

export async function loadIndexPatterns({
  patterns,
  savedObjectsClient,
  cache,
}: {
  patterns: string[];
  savedObjectsClient: SavedObjectsClient;
  cache: Record<string, IndexPattern>;
}) {
  const missingIds = patterns.filter((id) => !cache[id]);

  if (missingIds.length === 0) {
    return cache;
  }

  const resp = await savedObjectsClient.bulkGet(
    missingIds.map((id) => ({ id, type: 'index-pattern' }))
  );

  return resp.savedObjects.reduce(
    (acc, savedObject) => {
      const indexPattern = fromSavedObject(
        savedObject as SimpleSavedObject<SavedIndexPatternAttributes>
      );
      acc[indexPattern.id] = indexPattern;
      return acc;
    },
    { ...cache }
  );
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
}: {
  state?: IndexPatternPersistedState;
  savedObjectsClient: SavedObjectsClient;
  defaultIndexPatternId?: string;
  storage: IStorageWrapper;
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
    savedObjectsClient,
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
  savedObjectsClient,
  state,
  setState,
  onError,
  storage,
}: {
  id: string;
  savedObjectsClient: SavedObjectsClient;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
  storage: IStorageWrapper;
}) {
  try {
    const indexPatterns = await loadIndexPatterns({
      savedObjectsClient,
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
  savedObjectsClient,
  state,
  setState,
  onError,
  replaceIfPossible,
  storage,
}: {
  indexPatternId: string;
  layerId: string;
  savedObjectsClient: SavedObjectsClient;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
  replaceIfPossible?: boolean;
  storage: IStorageWrapper;
}) {
  try {
    const indexPatterns = await loadIndexPatterns({
      savedObjectsClient,
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
  indexPatterns: Array<{ id: string; timeFieldName?: string | null }>;
  fetchJson: HttpSetup['post'];
  setState: SetState;
  isFirstExistenceFetch: boolean;
  currentIndexPatternTitle: string;
  dslQuery: object;
  showNoDataPopover: () => void;
}) {
  const emptinessInfo = await Promise.all(
    indexPatterns.map((pattern) => {
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
    })
  );

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
    existingFields: emptinessInfo.reduce((acc, info) => {
      acc[info.indexPatternTitle] = booleanMap(info.existingFieldNames);
      return acc;
    }, state.existingFields),
  }));
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

function fromSavedObject(
  savedObject: SimpleSavedObject<SavedIndexPatternAttributes>
): IndexPattern {
  const { id, attributes, type } = savedObject;
  const indexPattern = {
    ...attributes,
    id,
    type,
    title: attributes.title,
    fields: (JSON.parse(attributes.fields) as IFieldType[])
      .filter(
        (field) =>
          !indexPatternsUtils.isNestedField(field) && (!!field.aggregatable || !!field.scripted)
      )
      .concat(documentField) as IndexPatternField[],
    typeMeta: attributes.typeMeta
      ? (JSON.parse(attributes.typeMeta) as IndexPatternTypeMeta)
      : undefined,
    fieldFormatMap: attributes.fieldFormatMap ? JSON.parse(attributes.fieldFormatMap) : undefined,
  };

  const { typeMeta } = indexPattern;
  if (!typeMeta) {
    return indexPattern;
  }

  const newFields = [...(indexPattern.fields as IndexPatternField[])];

  if (typeMeta.aggs) {
    const aggs = Object.keys(typeMeta.aggs);
    newFields.forEach((field, index) => {
      const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
      aggs.forEach((agg) => {
        const restriction = typeMeta.aggs && typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name];
        if (restriction) {
          restrictionsObj[agg] = restriction;
        }
      });
      if (Object.keys(restrictionsObj).length) {
        newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
      }
    });
  }

  return {
    id: indexPattern.id,
    title: indexPattern.title,
    timeFieldName: indexPattern.timeFieldName || undefined,
    fields: newFields,
  };
}
