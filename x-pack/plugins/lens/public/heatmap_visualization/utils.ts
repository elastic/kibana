/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { Datatable } from 'src/plugins/expressions';
import { applyPaletteParams, findMinMaxByColumnId } from '../shared_components';
import { DEFAULT_PALETTE_NAME } from './constants';
import type { HeatmapVisualizationState } from './types';

export function getSafePaletteParams(
  paletteService: PaletteRegistry,
  currentData: Datatable | undefined,
  accessor: string,
  activePalette?: HeatmapVisualizationState['palette']
) {
  const finalActivePalette: HeatmapVisualizationState['palette'] = activePalette ?? {
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
