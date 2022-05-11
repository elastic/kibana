/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/common';
import type { MapEmbeddablePersistableState } from './types';
import type { MapSavedObjectAttributes } from '../map_saved_object_type';
import { extractReferences, injectReferences } from '../migrations/references';

export const inject: EmbeddableRegistryDefinition['inject'] = (state, references) => {
  const typedState = state as MapEmbeddablePersistableState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    return typedState;
  }

  // by-value embeddable
  try {
    // run embeddable state through extract logic to ensure any state with hard coded ids is replace with refNames
    // refName generation will produce consistent values allowing inject logic to then replace refNames with current ids.
    const { attributes: attributesWithNoHardCodedIds } = extractReferences({
      attributes: typedState.attributes as MapSavedObjectAttributes,
    });

    const { attributes: attributesWithInjectedIds } = injectReferences({
      attributes: attributesWithNoHardCodedIds,
      references,
    });
    return {
      ...typedState,
      attributes: attributesWithInjectedIds,
    };
  } catch (error) {
    // inject exception prevents entire dashboard from display
    // Instead of throwing, swallow error and let dashboard display
    // Errors will surface in map panel. Any layer that failed injection will surface the error in the legend
    // Users can then manually edit map to resolve any problems.
    return typedState;
  }
};
