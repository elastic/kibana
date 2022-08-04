/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HeatmapIcon } from '@kbn/expression-heatmap-plugin/public';

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
    icon: HeatmapIcon,
    label: i18n.translate('xpack.lens.heatmap.heatmapLabel', {
      defaultMessage: 'Heat map',
    }),
    groupLabel,
  },
};

export const GROUP_ID = {
  X: 'x',
  Y: 'y',
  CELL: 'cell',
} as const;

export const FUNCTION_NAME = 'heatmap';

export const LEGEND_FUNCTION = 'heatmap_legend';

export const HEATMAP_GRID_FUNCTION = 'heatmap_grid';
