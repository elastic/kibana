/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  euiPaletteComplementary,
  euiPaletteForTemperature,
  euiPaletteGray,
  euiPalettePositive,
  euiPaletteWarm,
} from '@elastic/eui';
import { MlSavedObjectType } from '../../../common/types/saved_objects';

type MemoryItem = MlSavedObjectType | 'jvm-heap-size' | 'estimated-available-memory';

export function getMemoryItemColor(typeIn: MemoryItem) {
  switch (typeIn) {
    case 'anomaly-detector':
      return euiPaletteWarm(5)[1];
    case 'data-frame-analytics':
      return euiPalettePositive(5)[2];
    case 'trained-model':
      return euiPaletteForTemperature(5)[1];
    case 'estimated-available-memory':
      return euiPaletteGray(5)[0];
    case 'jvm-heap-size':
      return euiPaletteComplementary(5)[4];
    default:
      return euiPaletteGray(5)[4];
  }
}
