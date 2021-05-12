/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { Visualization } from '../types';
import { HeatmapVisualizationState } from './types';
import { CHART_SHAPES, HEATMAP_GRID_FUNCTION, LEGEND_FUNCTION } from './constants';

export const getSuggestions: Visualization<HeatmapVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
  mainPalette,
  subVisualizationId,
}) => {
  if (state?.shape === CHART_SHAPES.HEATMAP) {
    // don't provide suggestions when heatmap is the current chart
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

  /**
   * The score gets increased based on the config completion.
   */
  let score = 0;

  const [groups, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  const isSingleBucketDimension = groups.length === 1 && metrics.length === 0;

  /**
   * Hide for:
   * - reduced and reorder tables
   * - tables with just a single bucket dimension
   */
  const hide =
    table.changeType === 'reduced' || table.changeType === 'reorder' || isSingleBucketDimension;

  const newState: HeatmapVisualizationState = {
    shape: CHART_SHAPES.HEATMAP,
    layerId: table.layerId,
    legend: {
      isVisible: state?.legend?.isVisible ?? true,
      position: state?.legend?.position ?? Position.Right,
      type: LEGEND_FUNCTION,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
    },
  };

  const numberMetric = metrics.find((m) => m.operation.dataType === 'number');

  if (numberMetric) {
    score += 0.3;
    newState.valueAccessor = numberMetric.columnId;
  }

  const [dateHistogram, ordinal] = partition(groups, (g) => g.operation.dataType === 'date');

  if (dateHistogram.length > 0) {
    newState.xAccessor = dateHistogram[0].columnId;
    score += 0.3;
  }

  if (ordinal.length > 0) {
    if (!newState.xAccessor) {
      newState.xAccessor = ordinal[0].columnId;
      score += 0.3;
    } else {
      newState.yAccessor = ordinal[0].columnId;
      score += 0.3;
    }

    if (!newState.yAccessor && ordinal[1]) {
      newState.yAccessor = ordinal[1].columnId;
      score += 0.3;
    }
  }

  return [
    {
      state: newState,
      title: i18n.translate('xpack.lens.heatmap.heatmapLabel', {
        defaultMessage: 'Heatmap',
      }),
      hide,
      previewIcon: 'empty',
      score: Number(score.toFixed(1)),
    },
  ];
};
