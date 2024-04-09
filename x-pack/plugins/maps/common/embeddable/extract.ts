/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmbeddableRegistryDefinition,
  extractSavedObjectIdRef,
} from '@kbn/embeddable-plugin/common';
import { MapEmbeddablePersistableState } from './types';
import type { MapAttributes } from '../content_management';
import { extractReferences } from '../migrations/references';

export const extract: EmbeddableRegistryDefinition['extract'] = (_state) => {
  const typedState = _state as MapEmbeddablePersistableState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    const { state, references } = extractSavedObjectIdRef(_state, []);
    // return only the reference from the saved object ID since other references are stored with by-reference saved object
    return { state, references };
  }

  // by-value embeddable
  const { attributes, references } = extractReferences({
    attributes: typedState.attributes as MapAttributes,
  });

  return {
    state: {
      ..._state,
      attributes,
    },
    references,
  };
};
