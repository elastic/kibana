/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectReference } from '@kbn/core/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  getLayerReferenceName,
  setLastUsedIndexPatternId,
} from '../../../common/datasources/form_based/loader';
import { IndexPattern } from '../../../common/types';
import { FormBasedPersistedState, FormBasedPrivateState } from './types';

import {
  memoizedGetAvailableOperationsByMetadata,
  updateLayerIndexPattern,
} from '../../../common/datasources/form_based/operations';

export function onRefreshIndexPattern() {
  if (memoizedGetAvailableOperationsByMetadata.cache.clear) {
    // clear operations meta data cache because index pattern reference may change
    memoizedGetAvailableOperationsByMetadata.cache.clear();
  }
}

export function extractReferences({ layers }: FormBasedPrivateState) {
  const savedObjectReferences: SavedObjectReference[] = [];
  const persistableState: FormBasedPersistedState = {
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

export function changeIndexPattern({
  indexPatternId,
  state,
  storage,
  indexPatterns,
}: {
  indexPatternId: string;
  state: FormBasedPrivateState;
  storage: IStorageWrapper;
  indexPatterns: Record<string, IndexPattern>;
}) {
  setLastUsedIndexPatternId(indexPatternId, storage);
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
  state: FormBasedPrivateState;
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
  state: FormBasedPrivateState;
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
  layerIds,
  state,
  replaceIfPossible,
  storage,
}: {
  indexPatternId: string;
  layerIds: string[];
  state: FormBasedPrivateState;
  replaceIfPossible?: boolean;
  storage: IStorageWrapper;
  indexPatterns: Record<string, IndexPattern>;
}) {
  setLastUsedIndexPatternId(indexPatternId, storage);

  const newLayers = {
    ...state.layers,
  };

  layerIds.forEach((layerId) => {
    newLayers[layerId] = updateLayerIndexPattern(
      state.layers[layerId],
      indexPatterns[indexPatternId]
    );
  });

  return {
    ...state,
    layers: newLayers,
    currentIndexPatternId: replaceIfPossible ? indexPatternId : state.currentIndexPatternId,
  };
}

function isSingleEmptyLayer(layerMap: FormBasedPrivateState['layers']) {
  const layers = Object.values(layerMap);
  return layers.length === 1 && layers[0].columnOrder.length === 0;
}
