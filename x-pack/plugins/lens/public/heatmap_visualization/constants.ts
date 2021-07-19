/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensIconChartHeatmap } from '../assets/chart_heatmap';

export const LENS_HEATMAP_RENDERER = 'lens_heatmap_renderer';

export const LENS_HEATMAP_ID = 'lnsHeatmap';
export const DEFAULT_PALETTE_NAME = 'temperature';

const groupLabel = i18n.translate('xpack.lens.heatmap.groupLabel', {
  defaultMessage: 'Heatmap',
});

export const CHART_SHAPES = {
  HEATMAP: 'heatmap',
} as const;

export const CHART_NAMES = {
  heatmap: {
    shapeType: CHART_SHAPES.HEATMAP,
    icon: LensIconChartHeatmap,
    label: i18n.translate('xpack.lens.heatmap.heatmapLabel', {
      defaultMessage: 'Heatmap',
    }),
    groupLabel,
  },
};

export const GROUP_ID = {
  X: 'x',
  Y: 'y',
  CELL: 'cell',
} as const;

export const FUNCTION_NAME = 'lens_heatmap';

export const LEGEND_FUNCTION = 'lens_heatmap_legendConfig';

export const HEATMAP_GRID_FUNCTION = 'lens_heatmap_grid';
