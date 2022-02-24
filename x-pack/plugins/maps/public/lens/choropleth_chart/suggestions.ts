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
import { emsAutoSuggest } from '../../ems_autosuggest';

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

  const suggestions: Array<VisualizationSuggestion<ChoroplethChartState>> = [];
  buckets
    .filter((col) => {
      return col.operation.dataType === 'string';
    })
    .forEach((bucket) => {
      for (const tableId in activeData) {
        const sampleValues: string[] = [];
        const table = activeData[tableId];
        table.rows.forEach((row) => {
          const value = row[bucket.columnId];
          if (value && value !== '__other__' && !sampleValues.includes(value)) {
            sampleValues.push(value);
          }
        });

        const emsSuggestion = emsAutoSuggest({ sampleValues }, emsFileLayers);
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
              score: 0.5,
              state: {
                layerId: tableId,
                emsLayerId: emsSuggestion.layerId,
                emsField: emsSuggestion.field,
                metricColumnId: metric.columnId,
                bucketColumnId: bucket.columnId,
              },
              previewIcon: Icon,
            });
          });
        }
      }
    });

  return suggestions;
}
