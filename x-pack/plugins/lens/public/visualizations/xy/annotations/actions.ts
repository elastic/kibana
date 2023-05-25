/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayerActionFromVisualization } from '../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../types';

// Leaving the stub for annotation groups
export const createAnnotationActions = ({
  state,
  layer,
  layerIndex,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
}): LayerActionFromVisualization[] => {
  return [];
};
