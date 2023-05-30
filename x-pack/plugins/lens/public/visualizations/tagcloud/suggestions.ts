/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SuggestionRequest, VisualizationSuggestion } from '../../types';
import type { TagcloudState } from './types';

export function suggestions({
  table,
  state,
  keptLayerIds,
  mainPalette,
  subVisualizationId,
}: SuggestionRequest<TagcloudState>): Array<VisualizationSuggestion<TagcloudState>> {
  const isUnchanged = state && table.changeType === 'unchanged';
  if (
    isUnchanged ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0])
  ) {
    return [];
  }

  // do not offer suggestions for tables with date split
  const dateSplit = table.columns.find(col => {
    return col.operation.dataType === 'date';
  });
  if (dateSplit) {
    return [];
  }

  const groups = table.columns.filter(
    (col) => col.operation.isBucketed && col.operation.dataType === 'string'
  );
  const metrics = table.columns.filter(
    (col) => !col.operation.isBucketed && col.operation.dataType === 'number'
  );

  if (groups.length === 0 || metrics.length === 0) {
    return [];
  }

  return groups.map((group) => {
    return {
      title: i18n.translate('xpack.maps.lens.choroplethChart.suggestionLabel', {
        defaultMessage: '{groupLabel} tag cloud',
        values: {
          groupLabel: group.operation.label,
        },
      }),
      score: 0.6,
      state: {
        layerId: table.layerId,
        tagAccessor: group.columnId,
        valueAccessor: metrics[0].columnId,
        maxFontSize: 72,
        minFontSize: 18,
      },
    };
  });
}
