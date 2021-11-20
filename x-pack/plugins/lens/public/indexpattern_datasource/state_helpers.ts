/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPatternPrivateState, IndexPatternLayer } from './types';

export function mergeLayer({
  state,
  layerId,
  newLayer,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  newLayer: Partial<IndexPatternLayer>;
}) {
  return {
    ...state,
    layers: {
      ...state.layers,
      [layerId]: { ...state.layers[layerId], ...newLayer },
    },
  };
}
