/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from 'src/plugins/expressions';
import { applyPaletteParams, findMinMaxByColumnId } from '../shared_components';
import { DEFAULT_PALETTE_NAME } from './constants';
import type { HeatmapVisualizationState, Palette } from './types';

export function getSafePaletteParams(
  paletteService: PaletteRegistry,
  currentData: Datatable | undefined,
  accessor: string | undefined,
  activePalette?: HeatmapVisualizationState['palette']
) {
  if (currentData == null || accessor == null) {
    return { displayStops: [], activePalette };
  }
  const finalActivePalette: Palette = activePalette ?? {
    type: 'palette',
    name: DEFAULT_PALETTE_NAME,
    accessor,
  };
  const minMaxByColumnId = findMinMaxByColumnId([accessor], currentData);
  const currentMinMax = minMaxByColumnId[accessor];

  // need to tell the helper that the colorStops are required to display
  return {
    displayStops: applyPaletteParams(paletteService, finalActivePalette, currentMinMax),
    currentMinMax,
    activePalette: finalActivePalette,
  };
}
