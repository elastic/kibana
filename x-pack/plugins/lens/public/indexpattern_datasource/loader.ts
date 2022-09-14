/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, mapValues, difference } from 'lodash';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectReference } from '@kbn/core/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import {
  ActionExecutionContext,
  UiActionsStart,
  VisualizeFieldContext,
} from '@kbn/ui-actions-plugin/public';
import type { VisualizeEditorContext } from '../types';
import { IndexPatternPersistedState, IndexPatternPrivateState, IndexPatternLayer } from './types';

import { memoizedGetAvailableOperationsByMetadata, updateLayerIndexPattern } from './operations';
import { readFromStorage, writeToStorage } from '../settings_storage';
import type { IndexPattern, IndexPatternRef } from '../types';

export function onRefreshIndexPattern() {
  if (memoizedGetAvailableOperationsByMetadata.cache.clear) {
    // clear operations meta data cache because index pattern reference may change
    memoizedGetAvailableOperationsByMetadata.cache.clear();
  }
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

export function extractReferences({ layers }: IndexPatternPrivateState) {
  const savedObjectReferences: SavedObjectReference[] = [];
  const persistableState: IndexPatternPersistedState = {
    layers: {},
  };
  Object.entries(layers).forEach(([layerId, { indexPatternId, ...persistableLayer }]) => {
    persistableState.layers[layerId] = persistableLayer;
    savedObjectReferences.push({
      type: 'index-pattern',
      id: indexPatternId,
      name: getLayerReferenceName(layerId),
    });
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
      indexPatternId: references.find(({ name }) => name === getLayerReferenceName(layerId))!.id,
    };
  });
  return {
    layers,
  };
}

function createStateFromPersisted({
  persistedState,
  references,
}: {
  persistedState?: IndexPatternPersistedState;
  references?: SavedObjectReference[];
}) {
  return persistedState && references ? injectReferences(persistedState, references) : undefined;
}

function getUsedIndexPatterns({
  state,
  indexPatternRefs,
  storage,
  initialContext,
  defaultIndexPatternId,
}: {
  state?: {
    layers: Record<string, IndexPatternLayer>;
  };
  defaultIndexPatternId?: string;
  storage: IStorageWrapper;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  indexPatternRefs: IndexPatternRef[];
}) {
  const lastUsedIndexPatternId = getLastUsedIndexPatternId(storage, indexPatternRefs);
  const fallbackId = lastUsedIndexPatternId || defaultIndexPatternId || indexPatternRefs[0]?.id;
  const indexPatternIds = [];
  if (initialContext) {
    if ('isVisualizeAction' in initialContext) {
      for (const { indexPatternId } of initialContext.layers) {
        indexPatternIds.push(indexPatternId);
      }
    } else {
      indexPatternIds.push(initialContext.dataViewSpec.id!);
    }
  }
  const usedPatterns = (
    initialContext
      ? indexPatternIds
      : uniq(state ? Object.values(state.layers).map((l) => l.indexPatternId) : [fallbackId])
  )
    // take out the undefined from the list
    .filter(Boolean);

  return {
    usedPatterns,
    allIndexPatternIds: indexPatternIds,
  };
}

export function loadInitialState({
  persistedState,
  references,
  defaultIndexPatternId,
  storage,
  initialContext,
  indexPatternRefs = [],
  indexPatterns = {},
}: {
  persistedState?: IndexPatternPersistedState;
  references?: SavedObjectReference[];
  defaultIndexPatternId?: string;
  storage: IStorageWrapper;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  indexPatternRefs?: IndexPatternRef[];
  indexPatterns?: Record<string, IndexPattern>;
}): IndexPatternPrivateState {
  const state = createStateFromPersisted({ persistedState, references });
  const { usedPatterns, allIndexPatternIds: indexPatternIds } = getUsedIndexPatterns({
    state,
    defaultIndexPatternId,
    storage,
    initialContext,
    indexPatternRefs,
  });

  const availableIndexPatterns = new Set(indexPatternRefs.map(({ id }: IndexPatternRef) => id));

  const notUsedPatterns: string[] = difference([...availableIndexPatterns], usedPatterns);

  // Priority list:
  // * start with the indexPattern in context
  // * then fallback to the used ones
  // * then as last resort use a first one from not used refs
  const currentIndexPatternId = [...indexPatternIds, ...usedPatterns, ...notUsedPatterns].find(
    (id) => id != null && availableIndexPatterns.has(id) && indexPatterns[id]
  );

  if (currentIndexPatternId) {
    setLastUsedIndexPatternId(storage, currentIndexPatternId);
  }

  return {
    layers: {},
    ...state,
    currentIndexPatternId,
  };
}

export function changeIndexPattern({
  indexPatternId,
  state,
  storage,
  indexPatterns,
}: {
  indexPatternId: string;
  state: IndexPatternPrivateState;
  storage: IStorageWrapper;
  indexPatterns: Record<string, IndexPattern>;
}) {
  setLastUsedIndexPatternId(storage, indexPatternId);
  return {
    ...state,
    layers: isSingleEmptyLayer(state.layers)
      ? mapValues(state.layers, (layer) =>
          updateLayerIndexPattern(layer, indexPatterns[indexPatternId])
        )
      : state.layers,
    currentIndexPatternId: indexPatternId,
  };
}

export function renameIndexPattern({
  oldIndexPatternId,
  newIndexPatternId,
  state,
}: {
  oldIndexPatternId: string;
  newIndexPatternId: string;
  state: IndexPatternPrivateState;
}) {
  return {
    ...state,
    layers: mapValues(state.layers, (layer) =>
      layer.indexPatternId === oldIndexPatternId
        ? { ...layer, indexPatternId: newIndexPatternId }
        : layer
    ),
    currentIndexPatternId:
      state.currentIndexPatternId === oldIndexPatternId ? newIndexPatternId : oldIndexPatternId,
  };
}

export function triggerActionOnIndexPatternChange({
  state,
  layerId,
  uiActions,
  indexPatternId,
}: {
  indexPatternId: string;
  layerId: string;
  state: IndexPatternPrivateState;
  uiActions: UiActionsStart;
}) {
  const fromDataView = state.layers[layerId]?.indexPatternId;
  if (!fromDataView) return;
  const toDataView = indexPatternId;

  const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
  const action = uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

  action?.execute({
    trigger,
    fromDataView,
    toDataView,
    defaultDataView: toDataView,
    usedDataViews: Object.values(Object.values(state.layers).map((layer) => layer.indexPatternId)),
  } as ActionExecutionContext);
}

export function changeLayerIndexPattern({
  indexPatternId,
  indexPatterns,
  layerId,
  state,
  replaceIfPossible,
  storage,
}: {
  indexPatternId: string;
  layerId: string;
  state: IndexPatternPrivateState;
  replaceIfPossible?: boolean;
  storage: IStorageWrapper;
  indexPatterns: Record<string, IndexPattern>;
}) {
  setLastUsedIndexPatternId(storage, indexPatternId);
  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: updateLayerIndexPattern(state.layers[layerId], indexPatterns[indexPatternId]),
    },
    currentIndexPatternId: replaceIfPossible ? indexPatternId : state.currentIndexPatternId,
  };
}

function isSingleEmptyLayer(layerMap: IndexPatternPrivateState['layers']) {
  const layers = Object.values(layerMap);
  return layers.length === 1 && layers[0].columnOrder.length === 0;
}
