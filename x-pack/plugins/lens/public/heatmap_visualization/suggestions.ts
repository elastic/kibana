/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SuggestionRequest, VisualizationSuggestion } from '../types';
import { LensIconChartDatatable } from '../assets/chart_datatable';
import { HeatmapVisualizationState } from './types';

export function suggestions({
  table,
  state,
  keptLayerIds,
  mainPalette,
  subVisualizationId,
}: SuggestionRequest<HeatmapVisualizationState>): Array<
  VisualizationSuggestion<HeatmapVisualizationState>
> {
  if (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    (state && table.changeType === 'unchanged')
  ) {
    return [];
  }

  const title = i18n.translate('xpack.lens.heatmap.suggestionLabel', {
    defaultMessage: 'TODO suggestion',
  });

  return [
    {
      title,
      // table with >= 10 columns will have a score of 0.4, fewer columns reduce score
      score: (Math.min(table.columns.length, 10) / 10) * 0.4,
      state: {
        ...(state || {}),
        layerId: table.layerId,
      },
      previewIcon: LensIconChartDatatable,
      // tables are hidden from suggestion bar, but used for drag & drop and chart switching
      hide: true,
    },
  ];
}
