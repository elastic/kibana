/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { Position } from '@elastic/charts';
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
    // don't provide suggestion when heatmap is the current chart
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
  const title = 'TODO';

  const [groups, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  // heatmap chart requires exact 2 groups and single metric
  if (groups.length !== 2 || metrics.length !== 1) {
    return [];
  }

  const newState = ({
    title,
    shape: CHART_SHAPES.HEATMAP,
    layerId: table.layerId,
    legend: {
      isVisible: state?.legend?.isVisible ?? true,
      position: state?.legend?.position ?? Position.Top,
      type: LEGEND_FUNCTION,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
    },
  } as unknown) as HeatmapVisualizationState;

  if (metrics.length === 1 && metrics[0].operation.dataType === 'number') {
    newState.valueAccessor = metrics[0].columnId;
  }

  const [ordinal, dateHistogram] = partition(groups, (g) => g.operation.dataType === 'date');

  if (dateHistogram.length > 1) {
    // support single date histogram only
    return [];
  }

  if (dateHistogram.length === 1) {
    newState.xAccessor = dateHistogram[0].columnId;
    newState.yAccessor = ordinal[0].columnId;
  } else {
    newState.xAccessor = ordinal[0].columnId;
    newState.yAccessor = ordinal[1].columnId;
  }

  return [
    {
      state: newState,
      title: 'test',
      hide: false,
      previewIcon: '',
      score: 0.5,
    },
  ];
};
