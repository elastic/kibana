/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { LayerConfig, YConfig } from './types';
const ROTATION_LEN = 10;

export const getColorConfig = (layers: LayerConfig[]) => {
  const palette = euiPaletteColorBlind({
    rotations: layers.filter((l: LayerConfig) => l.splitAccessor).length + 1,
  });

  let counter = 0;
  let rotationOffset = 0;
  const colorConfig: Record<string, string> = {};

  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];
    for (let a = 0; a < layer.accessors.length; a++) {
      const accessor = layer.accessors[a];
      colorConfig[accessor] =
        layer?.yConfig?.find((yConfig) => yConfig.forAccessor === accessor)?.color ||
        palette[(counter % ROTATION_LEN) + rotationOffset * ROTATION_LEN];
      counter += 1;
    }
    if (layer.splitAccessor) {
      ++rotationOffset;
      counter = 0;
    }
  }
  return colorConfig;
};

export const getColorForPanel = (layer: LayerConfig, accessor: string, layers: LayerConfig[]) => {
  return (
    layer?.yConfig?.find((yConfig: YConfig) => yConfig.forAccessor === accessor)?.color ||
    getColorConfig(layers)[accessor]
  );
};
