/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYReferenceLineLayerConfig } from '@kbn/lens-plugin/public';
import type { FormulaValue, LayerValue, StaticValue } from '../../../types';

const REFERENCE_LAYER = 'referenceLayer';

export const referenceLineConfig: XYReferenceLineLayerConfig = {
  layerId: REFERENCE_LAYER,
  accessors: ['referenceColumn'],
  layerType: 'referenceLine',
  yConfig: [
    {
      forAccessor: 'referenceColumn',
      axisMode: 'left',
      color: '#6092c0',
    },
  ],
};

export const referenceLayer: LayerValue<StaticValue> = {
  name: 'layer',
  data: {
    value: 1,
    scale: 'ratio',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
};

export const normalizedLoad1m: LayerValue<FormulaValue> = {
  name: 'Normalized Load',
  data: {
    value: 'average(system.load.1) / max(system.load.cores)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
};
