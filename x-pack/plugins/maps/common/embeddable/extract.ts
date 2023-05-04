/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/common';
import { MapEmbeddablePersistableState } from './types';
import type { MapAttributes } from '../content_management';
import { extractReferences } from '../migrations/references';

export const extract: EmbeddableRegistryDefinition['extract'] = (state) => {
  const typedState = state as MapEmbeddablePersistableState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
    return { state, references: [] };
  }

  // by-value embeddable
  const { attributes, references } = extractReferences({
    attributes: typedState.attributes as MapAttributes,
  });

  return {
    state: {
      ...state,
      attributes,
    },
    references,
  };
};
