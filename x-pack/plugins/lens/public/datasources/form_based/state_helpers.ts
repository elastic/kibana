/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormBasedPrivateState, FormBasedLayer } from './types';

export function mergeLayer({
  state,
  layerId,
  newLayer,
}: {
  state: FormBasedPrivateState;
  layerId: string;
  newLayer: Partial<FormBasedLayer>;
}) {
  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: { ...state.layers[layerId], ...newLayer },
    },
  };
}

export function mergeLayers({
  state,
  newLayers,
}: {
  state: FormBasedPrivateState;
  newLayers: Record<string, FormBasedLayer>;
}) {
  return {
    ...state,
    layers: {
      ...state.layers,
      ...newLayers,
    },
  };
}
