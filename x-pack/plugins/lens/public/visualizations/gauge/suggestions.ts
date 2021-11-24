/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Visualization } from '../../types';
import { layerTypes } from '../../../common';
import { LensIconChartGaugeHorizontal } from '../../assets/chart_gauge';
import {
  GaugeShape,
  GaugeShapes,
  GaugeTicksPositions,
  GaugeTitleModes,
  GaugeVisualizationState,
} from '../../../common/expressions/gauge_chart';

export const getSuggestions: Visualization<GaugeVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
  subVisualizationId,
}) => {
  const isCurrentVisGauge =
    state && (state.minAccessor || state.maxAccessor || state.goalAccessor || state.metricAccessor);

  const isShapeChange =
    (subVisualizationId === GaugeShapes.horizontalBullet ||
      subVisualizationId === GaugeShapes.verticalBullet) &&
    isCurrentVisGauge &&
    subVisualizationId !== state?.shape;

  if (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    (!isShapeChange && table.columns.length > 1) ||
    table.columns?.[0]?.operation.dataType !== 'number' ||
    (isCurrentVisGauge && table.changeType !== 'extended' && table.changeType !== 'unchanged') ||
    table.columns.some((col) => col.operation.isBucketed)
  ) {
    return [];
  }

  const shape: GaugeShape =
    state?.shape === GaugeShapes.verticalBullet
      ? GaugeShapes.verticalBullet
      : GaugeShapes.horizontalBullet;

  const baseSuggestion = {
    state: {
      ...state,
      metricAccessor: table.columns[0].columnId,
      shape,
      layerId: table.layerId,
      layerType: layerTypes.DATA,
      ticksPosition: GaugeTicksPositions.auto,
      visTitleMode: GaugeTitleModes.auto,
    },
    title: i18n.translate('xpack.lens.gauge.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
    previewIcon: 'empty',
    score: 0.1,
    hide: !isShapeChange, // only display for gauges for beta
  };
  const suggestions = isShapeChange
    ? [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape:
              subVisualizationId === GaugeShapes.verticalBullet
                ? GaugeShapes.verticalBullet
                : GaugeShapes.horizontalBullet,
          },
        },
      ]
    : [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            shape,
          },
        },
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            shape: GaugeShapes.verticalBullet,
          },
        },
      ];

  return suggestions;
};
