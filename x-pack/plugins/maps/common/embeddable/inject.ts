/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableRegistryDefinition } from 'src/plugins/embeddable/server';
import { MapEmbeddablePersistableState } from './types';
import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { injectReferences } from '../migrations/references';

export const inject: EmbeddableRegistryDefinition['inject'] = (state, references) => {
  const typedState = state as MapEmbeddablePersistableState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    typedState;
  }

  // by-value embeddable
  const { attributes } = injectReferences({
    attributes: typedState.attributes as MapSavedObjectAttributes,
    references,
  });
  return {
    ...typedState,
    attributes,
  };
}