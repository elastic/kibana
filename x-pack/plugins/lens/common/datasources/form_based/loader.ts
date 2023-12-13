/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { difference, uniq } from 'lodash';
import type { FormBasedPersistedState } from '../../../public';
import type {
  FormBasedLayer,
  FormBasedPrivateState,
} from '../../../public/datasources/form_based/types';
import type { VisualizeEditorContext } from '../../../public/types';
import { readFromStorage, writeToStorage } from '../../settings_storage';
import type { IndexPattern, IndexPatternRef } from '../../types';

export function loadInitialState({
  persistedState,
  references,
  defaultIndexPatternId,
  storage,
  initialContext,
  indexPatternRefs = [],
  indexPatterns = {},
}: {
  persistedState?: FormBasedPersistedState;
  references?: SavedObjectReference[];
  defaultIndexPatternId?: string;
  storage?: IStorageWrapper;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  indexPatternRefs?: IndexPatternRef[];
  indexPatterns?: Record<string, IndexPattern>;
}): FormBasedPrivateState {
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

function createStateFromPersisted({
  persistedState,
  references,
}: {
  persistedState?: FormBasedPersistedState;
  references?: SavedObjectReference[];
}) {
  return persistedState && references ? injectReferences(persistedState, references) : undefined;
}

export function injectReferences(
  state: FormBasedPersistedState,
  references: SavedObjectReference[]
) {
  const layers: Record<string, FormBasedLayer> = {};
  Object.entries(state.layers).forEach(([layerId, persistedLayer]) => {
    const indexPatternId = references.find(
      ({ name }) => name === getLayerReferenceName(layerId)
    )?.id;

    if (indexPatternId) {
      layers[layerId] = {
        ...persistedLayer,
        indexPatternId,
      };
    }
  });
  return {
    layers,
  };
}

export function getLayerReferenceName(layerId: string) {
  return `indexpattern-datasource-layer-${layerId}`;
}

const getLastUsedIndexPatternId = (
  indexPatternRefs: IndexPatternRef[],
  storage?: IStorageWrapper
) => {
  if (!storage) {
    return undefined;
  }
  const indexPattern = readFromStorage(storage, 'indexPatternId');
  return indexPattern && indexPatternRefs.find((i) => i.id === indexPattern)?.id;
};

export const setLastUsedIndexPatternId = (storage: IStorageWrapper, value: string) => {
  writeToStorage(storage, 'indexPatternId', value);
};

function getUsedIndexPatterns({
  state,
  indexPatternRefs,
  storage,
  initialContext,
  defaultIndexPatternId,
}: {
  state?: {
    layers: Record<string, FormBasedLayer>;
  };
  defaultIndexPatternId?: string;
  storage?: IStorageWrapper;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  indexPatternRefs: IndexPatternRef[];
}) {
  const lastUsedIndexPatternId = getLastUsedIndexPatternId(indexPatternRefs, storage);
  const fallbackId = lastUsedIndexPatternId || defaultIndexPatternId || indexPatternRefs[0]?.id;
  const indexPatternIds = [];
  if (initialContext) {
    if ('isVisualizeAction' in initialContext) {
      indexPatternIds.push(...initialContext.indexPatternIds);
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
