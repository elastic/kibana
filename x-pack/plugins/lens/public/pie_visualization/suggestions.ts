/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { SuggestionRequest, TableSuggestionColumn, VisualizationSuggestion } from '../types';
import { layerTypes } from '../../common';
import type { PieVisualizationState } from '../../common/expressions';
import { PartitionChartsMeta } from './partition_charts_meta';
import { isPartitionShape } from './render_helpers';
import { PieChartTypes } from '../../common/expressions/pie_chart/types';

function hasIntervalScale(columns: TableSuggestionColumn[]) {
  return columns.some((col) => col.operation.scale === 'interval');
}

function shouldReject({ table, keptLayerIds, state }: SuggestionRequest<PieVisualizationState>) {
  // Histograms are not good for pi. But we should not reject them on switching between partition charts.
  const shouldRejectIntervals =
    state?.shape && isPartitionShape(state.shape) ? false : hasIntervalScale(table.columns);

  return (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.changeType === 'reorder' ||
    shouldRejectIntervals ||
    table.columns.some((col) => col.operation.isStaticValue)
  );
}

function getNewShape(
  groups: TableSuggestionColumn[],
  subVisualizationId?: PieVisualizationState['shape']
) {
  if (subVisualizationId) {
    return subVisualizationId;
  }

  let newShape: PieVisualizationState['shape'] | undefined;

  if (groups.length !== 1 && !subVisualizationId) {
    newShape = 'pie';
  }

  return newShape ?? 'donut';
}

function hasCustomSuggestionsExists(shape: PieChartTypes | string | undefined) {
  return shape ? ['treemap', 'waffle', 'mosaic'].includes(shape) : false;
}

const maximumGroupLength = Math.max(
  ...Object.values(PartitionChartsMeta).map(({ maxBuckets }) => maxBuckets)
);

export function suggestions({
  table,
  state,
  keptLayerIds,
  mainPalette,
  subVisualizationId,
}: SuggestionRequest<PieVisualizationState>): Array<
  VisualizationSuggestion<PieVisualizationState>
> {
  if (shouldReject({ table, state, keptLayerIds })) {
    return [];
  }

  const [groups, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  if (metrics.length > 1 || groups.length > maximumGroupLength) {
    return [];
  }

  const incompleteConfiguration = metrics.length === 0 || groups.length === 0;
  const metricColumnId = metrics.length > 0 ? metrics[0].columnId : undefined;

  if (incompleteConfiguration && state && !subVisualizationId) {
    // reject incomplete configurations if the sub visualization isn't specifically requested
    // this allows to switch chart types via switcher with incomplete configurations, but won't
    // cause incomplete suggestions getting auto applied on dropped fields
    return [];
  }

  const results: Array<VisualizationSuggestion<PieVisualizationState>> = [];

  if (
    groups.length <= PartitionChartsMeta.pie.maxBuckets &&
    !hasCustomSuggestionsExists(subVisualizationId)
  ) {
    const newShape = getNewShape(groups, subVisualizationId as PieVisualizationState['shape']);
    const baseSuggestion: VisualizationSuggestion<PieVisualizationState> = {
      title: i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: 'As {chartName}',
        values: { chartName: PartitionChartsMeta[newShape].label },
        description: 'chartName is already translated',
      }),
      score: state && !hasCustomSuggestionsExists(state.shape) ? 0.6 : 0.4,
      state: {
        shape: newShape,
        palette: mainPalette || state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                layerType: layerTypes.DATA,
              }
            : {
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
                layerType: layerTypes.DATA,
              },
        ],
      },
      previewIcon: 'bullseye',
      // dont show suggestions for same type
      hide:
        table.changeType === 'reduced' ||
        hasIntervalScale(groups) ||
        (state && !hasCustomSuggestionsExists(state.shape)),
    };

    results.push(baseSuggestion);
    results.push({
      ...baseSuggestion,
      title: i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: 'As {chartName}',
        values: { chartName: PartitionChartsMeta[newShape === 'pie' ? 'donut' : 'pie'].label },
        description: 'chartName is already translated',
      }),
      score: 0.1,
      state: {
        ...baseSuggestion.state,
        shape: newShape === 'pie' ? 'donut' : 'pie',
      },
      hide: true,
    });
  }

  if (
    groups.length <= PartitionChartsMeta.treemap.maxBuckets &&
    (!subVisualizationId || subVisualizationId === 'treemap')
  ) {
    results.push({
      title: i18n.translate('xpack.lens.pie.treemapSuggestionLabel', {
        defaultMessage: 'As Treemap',
      }),
      // Use a higher score when currently active, to prevent chart type switching
      // on the user unintentionally
      score: state?.shape === 'treemap' ? 0.7 : 0.5,
      state: {
        shape: 'treemap',
        palette: mainPalette || state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                categoryDisplay:
                  state.layers[0].categoryDisplay === 'inside'
                    ? 'default'
                    : state.layers[0].categoryDisplay,
                layerType: layerTypes.DATA,
              }
            : {
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
                layerType: layerTypes.DATA,
              },
        ],
      },
      previewIcon: 'bullseye',
      // hide treemap suggestions from bottom bar, but keep them for chart switcher
      hide:
        table.changeType === 'reduced' ||
        !state ||
        hasIntervalScale(groups) ||
        (state && state.shape === 'treemap'),
    });
  }

  if (
    groups.length <= PartitionChartsMeta.mosaic.maxBuckets &&
    (!subVisualizationId || subVisualizationId === 'mosaic')
  ) {
    results.push({
      title: i18n.translate('xpack.lens.pie.mosaicSuggestionLabel', {
        defaultMessage: 'As Mosaic',
      }),
      score: state?.shape === 'mosaic' ? 0.7 : 0.5,
      state: {
        shape: 'mosaic',
        palette: mainPalette || state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                categoryDisplay: 'default',
                layerType: layerTypes.DATA,
              }
            : {
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
                layerType: layerTypes.DATA,
              },
        ],
      },
      previewIcon: 'bullseye',
      hide: true,
    });
  }

  if (
    groups.length <= PartitionChartsMeta.waffle.maxBuckets &&
    (!subVisualizationId || subVisualizationId === 'waffle')
  ) {
    results.push({
      title: i18n.translate('xpack.lens.pie.waffleSuggestionLabel', {
        defaultMessage: 'As Waffle',
      }),
      score: state?.shape === 'waffle' ? 0.7 : 0.5,
      state: {
        shape: 'waffle',
        palette: mainPalette || state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                categoryDisplay: 'default',
                layerType: layerTypes.DATA,
              }
            : {
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
                layerType: layerTypes.DATA,
              },
        ],
      },
      previewIcon: 'bullseye',
      hide: true,
    });
  }

  return [...results]
    .map((suggestion) => ({
      ...suggestion,
      score: suggestion.score + 0.05 * groups.length,
    }))
    .sort((a, b) => b.score - a.score)
    .map((suggestion) => ({
      ...suggestion,
      hide: incompleteConfiguration || suggestion.hide,
    }));
}
