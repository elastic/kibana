/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord, Serializable } from '@kbn/utility-types';
import type { SavedObjectReference } from '@kbn/core/types';
import {
  EmbeddableStateWithType,
  EmbeddableRegistryDefinition,
  extractSavedObjectIdRef,
  injectSavedObjectIdRef,
} from '@kbn/embeddable-plugin/common';

export type LensEmbeddablePersistableState = EmbeddableStateWithType & {
  attributes: SerializableRecord;
};

export const inject: EmbeddableRegistryDefinition['inject'] = (state, references) => {
  const typedState = state as LensEmbeddablePersistableState;

  if ('attributes' in typedState && typedState.attributes !== undefined) {
    // match references based on name, so only references associated with this lens panel are injected.
    const matchedReferences: SavedObjectReference[] = [];

    if (Array.isArray(typedState.attributes.references)) {
      typedState.attributes.references.forEach((serializableRef) => {
        const internalReference = serializableRef as unknown as SavedObjectReference;
        const matchedReference = references.find(
          (reference) => reference.name === internalReference.name
        );
        if (matchedReference) matchedReferences.push(matchedReference);
      });
    }

    typedState.attributes.references = matchedReferences as unknown as Serializable[];
  }

  const stateWithSOId = injectSavedObjectIdRef(typedState, references);
  return stateWithSOId;
};

export const extract: EmbeddableRegistryDefinition['extract'] = (state) => {
  let references: SavedObjectReference[] = [];
  const typedState = state as LensEmbeddablePersistableState;

  if ('attributes' in typedState && typedState.attributes !== undefined) {
    references = typedState.attributes.references as unknown as SavedObjectReference[];
  }

  const { references: referencesWithExtractedSOId, state: stateWithoutSOId } =
    extractSavedObjectIdRef(typedState, references);

  return { state: stateWithoutSOId, references: referencesWithExtractedSOId };
};
