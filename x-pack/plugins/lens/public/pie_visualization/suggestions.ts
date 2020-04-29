/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SuggestionRequest, VisualizationSuggestion } from '../types';
import { PieVisualizationState } from './types';
import { CHART_NAMES, MAX_PIE_BUCKETS, MAX_TREEMAP_BUCKETS } from './constants';

function shouldReject({ table, keptLayerIds }: SuggestionRequest<PieVisualizationState>) {
  return (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.changeType === 'reorder' ||
    table.columns.some(col => col.operation.dataType === 'date')
  );
}

export function suggestions({
  table,
  state,
  keptLayerIds,
}: SuggestionRequest<PieVisualizationState>): Array<
  VisualizationSuggestion<PieVisualizationState>
> {
  if (shouldReject({ table, state, keptLayerIds })) {
    return [];
  }

  const [groups, metrics] = partition(table.columns, col => col.operation.isBucketed);

  if (groups.length === 0 || metrics.length !== 1) {
    return [];
  }

  const results: Array<VisualizationSuggestion<PieVisualizationState>> = [];

  if (groups.length <= MAX_PIE_BUCKETS) {
    let newShape: PieVisualizationState['shape'] = 'donut';
    if (state && state.shape === 'donut' && groups.length !== 1) {
      newShape = 'pie';
    }

    results.push({
      title: getTitle({ table, state, keptLayerIds }),
      score: 0.6,
      state: {
        shape: newShape,
        layers: [
          {
            layerId: table.layerId,
            groups: groups.map(col => col.columnId),
            metric: metrics[0].columnId,
            numberDisplay: state?.layers[0]?.numberDisplay || 'percent',
            categoryDisplay: state?.layers[0]?.categoryDisplay || 'default',
            legendDisplay: state?.layers[0]?.legendDisplay || 'default',
          },
        ],
      },
      previewIcon: 'bullseye',
      // dont show suggestions for same type
      hide: table.changeType === 'reduced' || (state && state.shape !== 'treemap'),
    });
  }

  if (groups.length <= MAX_TREEMAP_BUCKETS) {
    results.push({
      title:
        state?.shape === 'treemap'
          ? getTitle({ table, state, keptLayerIds })
          : i18n.translate('xpack.lens.pie.treemapLabel', { defaultMessage: 'Treemap' }),
      score: 0.5,
      state: {
        shape: 'treemap',
        layers: [
          {
            layerId: table.layerId,
            groups: groups.map(col => col.columnId),
            metric: metrics[0].columnId,
            numberDisplay: state?.layers[0]?.numberDisplay || 'percent',
            categoryDisplay: state?.layers[0]?.categoryDisplay || 'default',
            legendDisplay: state?.layers[0]?.legendDisplay || 'default',
          },
        ],
      },
      previewIcon: 'bullseye',
      // hide treemap suggestions from bottom bar, but keep them for chart switcher
      hide: table.changeType === 'reduced' || !state || (state && state.shape === 'treemap'),
    });
  }

  return results;
}

export function getTitle({ table, state }: SuggestionRequest<PieVisualizationState>) {
  return table.changeType === 'unchanged'
    ? i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: 'As {chartName}',
        values: { chartName: state ? CHART_NAMES[state.shape].label : CHART_NAMES.donut.label },
      })
    : i18n.translate('xpack.lens.pie.suggestionOf', {
        defaultMessage: '{chartName} {operations}',
        values: {
          chartName: state ? CHART_NAMES[state.shape].label : CHART_NAMES.donut.label,
          operations:
            table.label ||
            table.columns
              .map(col => col.operation.label)
              .join(
                i18n.translate('xpack.lens.datatable.conjunctionSign', {
                  defaultMessage: ' & ',
                  description:
                    'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
                })
              ),
        },
      });
}
