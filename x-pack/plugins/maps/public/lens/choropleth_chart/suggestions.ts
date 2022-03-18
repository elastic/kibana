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
  suggestionRequest: SuggestionRequest<ChoroplethChartState>,
  emsFileLayers: FileLayer[]
): Array<VisualizationSuggestion<ChoroplethChartState>> {
  const { activeData, keptLayerIds, state, table } = suggestionRequest;

  if (!activeData) {
    return [];
  }

  const isUnchanged = state && table.changeType === 'unchanged';
  if (
    isUnchanged ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0])
  ) {
    return [];
  }

  const [buckets, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  if (buckets.length !== 1 || metrics.length !== 1) {
    return [];
  }

  const metric = metrics[0];
  const suggestions: Array<VisualizationSuggestion<ChoroplethChartState>> = [];
  buckets
    .filter((col) => {
      return col.operation.dataType === 'string';
    })
    .forEach((bucket) => {
      for (const tableId in activeData) {
        if (activeData.hasOwnProperty(tableId)) {
          const emsSuggestion = getEmsSuggestion(
            emsFileLayers,
            activeData[tableId],
            bucket.columnId
          );
          if (emsSuggestion) {
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
          }
        }
      }
    });

  return suggestions;
}
