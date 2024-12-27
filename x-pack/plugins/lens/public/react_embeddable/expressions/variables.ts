/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { TextBasedPersistedState } from '../../datasources/text_based/types';
import { LensApi, LensRuntimeState } from '../types';

function getInternalTables(states: Record<string, unknown>) {
  const result: Record<string, Datatable> = {};
  if ('textBased' in states) {
    const layers = (states.textBased as TextBasedPersistedState).layers;
    for (const layer in layers) {
      if (layers[layer]?.table) {
        result[layer] = layers[layer].table!;
      }
    }
  }
  return result;
}

/**
 * Collect all the data that need to be forwarded at the end of the
 * expression pipeline as overrides, palette, etc... and merged them all here
 */
export function getVariables(api: LensApi, state: LensRuntimeState) {
  return {
    embeddableTitle: api.defaultPanelTitle?.getValue(),
    ...(state.palette ? { theme: { palette: state.palette } } : {}),
    ...('overrides' in state ? { overrides: state.overrides } : {}),
    ...getInternalTables(state.attributes.state.datasourceStates),
  };
}
