/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Origin } from '@kbn/expression-reveal-image-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { TableSuggestion, Visualization } from '../../types';
import type { RevealImageVisualizationState } from './constants';

const isNotNumericMetric = (table: TableSuggestion) =>
  table.columns?.[0]?.operation.dataType !== 'number' ||
  table.columns.some((col) => col.operation.isBucketed);

const hasLayerMismatch = (keptLayerIds: string[], table: TableSuggestion) =>
  keptLayerIds.length > 1 || (keptLayerIds.length && table.layerId !== keptLayerIds[0]);

const icon = 'image';

export const getSuggestions: Visualization<RevealImageVisualizationState>['getSuggestions'] = ({
  table,
  state,
  keptLayerIds,
  subVisualizationId,
}) => {
  const isRevealImage = Boolean(state && (state.maxAccessor || state.metricAccessor));

  const numberOfAccessors =
    state && [state.maxAccessor, state.metricAccessor].filter(Boolean).length;

  if (
    hasLayerMismatch(keptLayerIds, table) ||
    isNotNumericMetric(table) ||
    (state && !isRevealImage && table.columns.length > 1) ||
    (isRevealImage &&
      (numberOfAccessors !== table.columns.length || table.changeType === 'initial'))
  ) {
    return [];
  }

  const baseSuggestion = {
    state: {
      ...state,
      layerId: table.layerId,
      layerType: LayerTypes.DATA,
    },
    title: i18n.translate('xpack.lens.revealImage.revealImageLabel', {
      defaultMessage: 'RevealImage',
    }),
    previewIcon: 'image',
    score: 0.5,
    origin: Origin.BOTTOM,
    hide: !isRevealImage || state?.metricAccessor === undefined, // only display for gauges for beta
    incomplete: state?.metricAccessor === undefined,
  };

  const suggestions = isRevealImage
    ? [
        {
          ...baseSuggestion,
          previewIcon: icon,
          state: {
            ...baseSuggestion.state,
            ...state,
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
          previewIcon: icon,
          state: {
            ...baseSuggestion.state,
            metricAccessor: table.columns[0].columnId,
          },
        },
      ];

  return suggestions;
};
