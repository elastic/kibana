/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TableSuggestion, Visualization } from '../../types';
import { layerTypes } from '../../../common';
import {
  GaugeShape,
  GaugeShapes,
  GaugeTicksPositions,
  GaugeLabelMajorModes,
  GaugeVisualizationState,
} from '../../../common/expressions/gauge_chart';

const isNotNumericMetric = (table: TableSuggestion) =>
  table.columns?.[0]?.operation.dataType !== 'number' ||
  table.columns.some((col) => col.operation.isBucketed);

const hasLayerMismatch = (keptLayerIds: string[], table: TableSuggestion) =>
  keptLayerIds.length > 1 || (keptLayerIds.length && table.layerId !== keptLayerIds[0]);

export const getSuggestions: Visualization<GaugeVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
  subVisualizationId,
}) => {
  const isGauge = Boolean(
    state && (state.minAccessor || state.maxAccessor || state.goalAccessor || state.metricAccessor)
  );

  const numberOfAccessors =
    state &&
    [state.minAccessor, state.maxAccessor, state.goalAccessor, state.metricAccessor].filter(Boolean)
      .length;

  if (
    hasLayerMismatch(keptLayerIds, table) ||
    isNotNumericMetric(table) ||
    (!isGauge && table.columns.length > 1) ||
    (isGauge && (numberOfAccessors !== table.columns.length || table.changeType === 'initial'))
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
      shape,
      layerId: table.layerId,
      layerType: layerTypes.DATA,
      ticksPosition: GaugeTicksPositions.auto,
      labelMajorMode: GaugeLabelMajorModes.auto,
    },
    title: i18n.translate('xpack.lens.gauge.gaugeLabel', {
      defaultMessage: 'Gauge',
    }),
    previewIcon: 'empty',
    score: 0.5,
    hide: !isGauge || state?.metricAccessor === undefined, // only display for gauges for beta
  };

  const suggestions = isGauge
    ? [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            ...state,
            shape:
              state?.shape === GaugeShapes.verticalBullet
                ? GaugeShapes.horizontalBullet
                : GaugeShapes.verticalBullet,
          },
        },
      ]
    : [
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            metricAccessor: table.columns[0].columnId,
          },
        },
        {
          ...baseSuggestion,
          state: {
            ...baseSuggestion.state,
            metricAccessor: table.columns[0].columnId,
            shape:
              state?.shape === GaugeShapes.verticalBullet
                ? GaugeShapes.horizontalBullet
                : GaugeShapes.verticalBullet,
          },
        },
      ];

  return suggestions;
};
