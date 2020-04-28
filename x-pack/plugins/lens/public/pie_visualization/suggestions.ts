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

function shouldReject({ table, state, keptLayerIds }: SuggestionRequest<PieVisualizationState>) {
  return (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    (state && table.changeType === 'unchanged') ||
    table.changeType === 'reorder' ||
    table.columns.some(col => col.operation.dataType === 'date')
  );
}

export function pieSuggestions({
  table,
  state,
  keptLayerIds,
}: SuggestionRequest<PieVisualizationState>): Array<
  VisualizationSuggestion<PieVisualizationState>
> {
  if (shouldReject({ table, state, keptLayerIds })) {
    return [];
  }

  const [slices, metrics] = partition(table.columns, col => col.operation.isBucketed);

  const MAX_GROUPS = state?.shape === 'treemap' ? MAX_TREEMAP_BUCKETS : MAX_PIE_BUCKETS;
  if (slices.length === 0 || slices.length > MAX_GROUPS || metrics.length !== 1) {
    return [];
  }

  const title =
    table.changeType === 'unchanged'
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

  return [
    {
      title,
      score: 0.6,
      state: {
        shape: state ? state.shape : slices.length === 1 ? 'donut' : 'pie',
        layers: [
          {
            layerId: table.layerId,
            slices: slices.map(col => col.columnId),
            metric: metrics[0].columnId,
            numberDisplay: state?.layers[0]?.numberDisplay || 'hidden',
            categoryDisplay: state?.layers[0]?.categoryDisplay || 'default',
            legendDisplay: state?.layers[0]?.legendDisplay || 'default',
          },
        ],
      },
      previewIcon: 'bullseye',
      // dont show suggestions for same type
      hide: table.changeType === 'reduced',
    },
  ];
}
