/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { FileLayer } from '@elastic/ems-client';
import type { SuggestionRequest, VisualizationSuggestion } from '../../../../lens/public';
import type { ChoroplethChartState } from './types';
import { Icon } from './icon';
import { getEmsSuggestion } from './get_ems_suggestion';

/**
 * Generate choroplath chart suggestions for buckets that match administrative boundaries from the Elastic Maps Service.
 */
export function getSuggestions(
  { table, state, keptLayerIds, activeData }: SuggestionRequest<ChoroplethChartState>,
  emsFileLayers: FileLayer[]
): Array<VisualizationSuggestion<ChoroplethChartState>> {
  if (!activeData) {
    return [];
  }

  const [buckets, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  // TODO return empty array if more then one bucket or more then one metric

  const suggestions: Array<VisualizationSuggestion<ChoroplethChartState>> = [];
  buckets
    .filter((col) => {
      return col.operation.dataType === 'string';
    })
    .forEach((bucket) => {
      for (const tableId in activeData) {
        const emsSuggestion = getEmsSuggestion(emsFileLayers, activeData[tableId], bucket.columnId);
        if (emsSuggestion) {
          metrics.forEach((metric) => {
            suggestions.push({
              title: i18n.translate('xpack.maps.lens.choroplethChart.suggestionLabel', {
                defaultMessage: '{emsLayerLabel} by {metricLabel}',
                values: {
                  emsLayerLabel: emsSuggestion.displayName,
                  metricLabel: metric.operation.label.toLowerCase(),
                },
              }),
              score: 0.7,
              state: {
                layerId: tableId,
                emsLayerId: emsSuggestion.layerId,
                emsField: emsSuggestion.field,
                valueAccessor: metric.columnId,
                regionAccessor: bucket.columnId,
              },
              previewIcon: Icon,
            });
          });
        }
      }
    });

  return suggestions;
}
