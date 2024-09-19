/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { Visualization } from '../types';
import type { HeatmapVisualizationState } from './types';
import { CHART_SHAPES, HEATMAP_GRID_FUNCTION, LEGEND_FUNCTION } from './constants';
import { layerTypes } from '../../common';

export const getSuggestions: Visualization<HeatmapVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
}) => {
  if (
    state?.shape === CHART_SHAPES.HEATMAP &&
    (state.xAccessor || state.yAccessor || state.valueAccessor) &&
    table.changeType !== 'extended'
  ) {
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

  if (groups.length >= 3) {
    return [];
  }

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
    layerType: layerTypes.DATA,
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

  const [histogram, ordinal] = partition(groups, (g) => g.operation.scale === 'interval');

  newState.xAccessor = histogram[0]?.columnId || ordinal[0]?.columnId;
  newState.yAccessor = groups.find((g) => g.columnId !== newState.xAccessor)?.columnId;

  if (newState.xAccessor) {
    score += 0.3;
  }
  if (newState.yAccessor) {
    score += 0.3;
  }

  return [
    {
      state: newState,
      title: i18n.translate('xpack.lens.heatmap.heatmapLabel', {
        defaultMessage: 'Heatmap',
      }),
      // Temp hide all suggestions while heatmap is in beta
      hide: true || hide,
      previewIcon: 'empty',
      score: Number(score.toFixed(1)),
    },
  ];
};
