/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import type { PaletteOutput } from '@kbn/coloring';
import {
  SuggestionRequest,
  VisualizationSuggestion,
  TableSuggestionColumn,
  TableSuggestion,
  TableChangeType,
} from '../types';
import { State, XYState, visualizationTypes, XYLayerConfig, XYDataLayerConfig } from './types';
import type { SeriesType } from '../../../../../src/plugins/chart_expressions/expression_xy/common';
import { layerTypes } from '../../common';
import { getIconForSeries } from './state_helpers';
import { getDataLayers, isDataLayer } from './visualization_helpers';

const columnSortOrder = {
  document: 0,
  date: 1,
  string: 2,
  ip: 3,
  boolean: 4,
  number: 5,
  histogram: 6,
  geo_point: 7,
  geo_shape: 8,
  murmur3: 9,
};

/**
 * Generate suggestions for the xy chart.
 *
 * @param opts
 */
export function getSuggestions({
  table,
  state,
  keptLayerIds,
  subVisualizationId,
  mainPalette,
  isFromContext,
}: SuggestionRequest<State>): Array<VisualizationSuggestion<State>> {
  const incompleteTable =
    !table.isMultiRow ||
    table.columns.length <= 1 ||
    table.columns.every((col) => col.operation.dataType !== 'number') ||
    table.columns.some((col) => !columnSortOrder.hasOwnProperty(col.operation.dataType));
  if (incompleteTable && table.changeType === 'unchanged' && state) {
    // this isn't a table we would switch to, but we have a state already. In this case, just use the current state for all series types
    return visualizationTypes.map((visType) => {
      const seriesType = visType.id as SeriesType;
      return {
        seriesType,
        score: 0,
        state: {
          ...state,
          preferredSeriesType: seriesType,
          layers: state.layers.map((layer) => ({ ...layer, seriesType })),
        },
        previewIcon: getIconForSeries(seriesType),
        title: visType.label,
        hide: true,
      };
    });
  }

  if (
    (incompleteTable && state && !subVisualizationId) ||
    table.columns.some((col) => col.operation.isStaticValue && !isFromContext) ||
    // do not use suggestions with non-numeric metrics
    table.columns.some((col) => !col.operation.isBucketed && col.operation.dataType !== 'number')
  ) {
    // reject incomplete configurations if the sub visualization isn't specifically requested
    // this allows to switch chart types via switcher with incomplete configurations, but won't
    // cause incomplete suggestions getting auto applied on dropped fields
    return [];
  }

  const suggestions = getSuggestionForColumns(
    table,
    keptLayerIds,
    state,
    subVisualizationId as SeriesType | undefined,
    mainPalette
  );

  if (suggestions && suggestions instanceof Array) {
    return suggestions;
  }

  return suggestions ? [suggestions] : [];
}

function getSuggestionForColumns(
  table: TableSuggestion,
  keptLayerIds: string[],
  currentState?: State,
  seriesType?: SeriesType,
  mainPalette?: PaletteOutput
): VisualizationSuggestion<State> | Array<VisualizationSuggestion<State>> | undefined {
  const [buckets, values] = partition(table.columns, (col) => col.operation.isBucketed);

  if (buckets.length === 1 || buckets.length === 2) {
    const [x, splitBy] = getBucketMappings(table, currentState);
    return getSuggestionsForLayer({
      layerId: table.layerId,
      changeType: table.changeType,
      xValue: x,
      yValues: values,
      splitBy,
      currentState,
      tableLabel: table.label,
      keptLayerIds,
      requestedSeriesType: seriesType,
      mainPalette,
    });
  } else if (buckets.length === 0) {
    const [yValues, [xValue, splitBy]] = partition(
      prioritizeColumns(values),
      (col) => col.operation.dataType === 'number' && !col.operation.isBucketed
    );
    return getSuggestionsForLayer({
      layerId: table.layerId,
      changeType: table.changeType,
      xValue,
      yValues,
      splitBy,
      currentState,
      tableLabel: table.label,
      keptLayerIds,
      requestedSeriesType: seriesType,
      mainPalette,
    });
  }
}

function flipSeriesType(seriesType: SeriesType) {
  switch (seriesType) {
    case 'bar_horizontal':
      return 'bar';
    case 'bar_horizontal_stacked':
      return 'bar_stacked';
    case 'bar':
      return 'bar_horizontal';
    case 'bar_horizontal_percentage_stacked':
      return 'bar_percentage_stacked';
    case 'bar_percentage_stacked':
      return 'bar_horizontal_percentage_stacked';
    default:
      return 'bar_horizontal';
  }
}

function getBucketMappings(table: TableSuggestion, currentState?: State) {
  const currentLayer =
    currentState &&
    getDataLayers(currentState.layers).find(({ layerId }) => layerId === table.layerId);

  const buckets = table.columns.filter((col) => col.operation.isBucketed);
  // reverse the buckets before prioritization to always use the most inner
  // bucket of the highest-prioritized group as x value (don't use nested
  // buckets as split series)
  const prioritizedBuckets = prioritizeColumns([...buckets].reverse());

  if (!currentLayer || table.changeType === 'initial') {
    return prioritizedBuckets;
  }
  if (table.changeType === 'reorder') {
    return buckets;
  }

  // if existing table is just modified, try to map buckets to the current dimensions
  const currentXColumnIndex = prioritizedBuckets.findIndex(
    ({ columnId }) => columnId === currentLayer.xAccessor
  );
  const currentXScaleType =
    currentXColumnIndex > -1 && prioritizedBuckets[currentXColumnIndex].operation.scale;

  if (
    currentXScaleType &&
    // make sure histograms get mapped to x dimension even when changing current bucket/dimension mapping
    (currentXScaleType === 'interval' || prioritizedBuckets[0].operation.scale !== 'interval')
  ) {
    const [x] = prioritizedBuckets.splice(currentXColumnIndex, 1);
    prioritizedBuckets.unshift(x);
  }

  const currentSplitColumnIndex = prioritizedBuckets.findIndex(
    ({ columnId }) => columnId === currentLayer.splitAccessor
  );
  if (currentSplitColumnIndex > -1) {
    const [splitBy] = prioritizedBuckets.splice(currentSplitColumnIndex, 1);
    prioritizedBuckets.push(splitBy);
  }

  return prioritizedBuckets;
}

// This shuffles columns around so that the left-most column defualts to:
// date, string, boolean, then number, in that priority. We then use this
// order to pluck out the x column, and the split / stack column.
function prioritizeColumns(columns: TableSuggestionColumn[]) {
  return [...columns].sort(
    (a, b) => columnSortOrder[a.operation.dataType] - columnSortOrder[b.operation.dataType]
  );
}

function getSuggestionsForLayer({
  layerId,
  changeType,
  xValue,
  yValues,
  splitBy,
  currentState,
  tableLabel,
  keptLayerIds,
  requestedSeriesType,
  mainPalette,
}: {
  layerId: string;
  changeType: TableChangeType;
  xValue?: TableSuggestionColumn;
  yValues: TableSuggestionColumn[];
  splitBy?: TableSuggestionColumn;
  currentState?: State;
  tableLabel?: string;
  keptLayerIds: string[];
  requestedSeriesType?: SeriesType;
  mainPalette?: PaletteOutput;
}): VisualizationSuggestion<State> | Array<VisualizationSuggestion<State>> {
  const title = getSuggestionTitle(yValues, xValue, tableLabel);
  const seriesType: SeriesType =
    requestedSeriesType || getSeriesType(currentState, layerId, xValue);

  const options = {
    currentState,
    seriesType,
    layerId,
    title,
    yValues,
    splitBy,
    changeType,
    xValue,
    keptLayerIds,
    // only use palette if there is a breakdown by dimension
    mainPalette: splitBy ? mainPalette : undefined,
  };

  // handles the simplest cases, acting as a chart switcher
  if (!currentState && changeType === 'unchanged') {
    // Chart switcher needs to include every chart type
    return visualizationTypes
      .map((visType) => {
        return {
          ...buildSuggestion({
            ...options,
            seriesType: visType.id as SeriesType,
            // explicitly hide everything besides stacked bars, use default hiding logic for stacked bars
            hide: visType.id === 'bar_stacked' ? undefined : true,
          }),
          title: visType.label,
        };
      })
      .sort((a, b) => (a.state.preferredSeriesType === 'bar_stacked' ? -1 : 1));
  }

  const isSameState = currentState && changeType === 'unchanged';
  if (!isSameState) {
    return buildSuggestion(options);
  }

  // Suggestions are either changing the data, or changing the way the data is used
  const sameStateSuggestions: Array<VisualizationSuggestion<State>> = [];

  // if current state is using the same data, suggest same chart with different presentational configuration
  if (seriesType.includes('bar') && (!xValue || xValue.operation.scale === 'ordinal')) {
    // flip between horizontal/vertical for ordinal scales
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        title: i18n.translate('xpack.lens.xySuggestions.flipTitle', { defaultMessage: 'Flip' }),
        seriesType: flipSeriesType(seriesType),
      })
    );
  } else {
    // change chart type for interval or ratio scales on x axis
    const newSeriesType = altSeriesType(seriesType);
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        seriesType: newSeriesType,
        title: newSeriesType.startsWith('bar')
          ? i18n.translate('xpack.lens.xySuggestions.barChartTitle', {
              defaultMessage: 'Bar chart',
            })
          : i18n.translate('xpack.lens.xySuggestions.lineChartTitle', {
              defaultMessage: 'Line chart',
            }),
      })
    );
  }

  if (seriesType !== 'line' && splitBy && !seriesType.includes('percentage')) {
    // flip between stacked/unstacked
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        seriesType: toggleStackSeriesType(seriesType),
        title: seriesType.endsWith('stacked')
          ? i18n.translate('xpack.lens.xySuggestions.unstackedChartTitle', {
              defaultMessage: 'Unstacked',
            })
          : i18n.translate('xpack.lens.xySuggestions.stackedChartTitle', {
              defaultMessage: 'Stacked',
            }),
      })
    );
  }

  if (
    seriesType !== 'line' &&
    seriesType.includes('stacked') &&
    !seriesType.includes('percentage')
  ) {
    const percentageOptions = { ...options };
    if (percentageOptions.xValue?.operation.scale === 'ordinal' && !percentageOptions.splitBy) {
      percentageOptions.splitBy = percentageOptions.xValue;
      delete percentageOptions.xValue;
    }
    // percentage suggestion
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        // hide the suggestion if split by is missing
        hide: !percentageOptions.splitBy,
        seriesType: asPercentageSeriesType(seriesType),
        title: i18n.translate('xpack.lens.xySuggestions.asPercentageTitle', {
          defaultMessage: 'Percentage',
        }),
      })
    );
  }

  // Combine all pre-built suggestions with hidden suggestions for remaining chart types
  return sameStateSuggestions.concat(
    visualizationTypes
      .filter((visType) => {
        return !sameStateSuggestions.find(
          (suggestion) => suggestion.state.preferredSeriesType === visType.id
        );
      })
      .map((visType) => {
        return {
          ...buildSuggestion({ ...options, seriesType: visType.id as SeriesType }),
          hide: true,
        };
      })
  );
}

function toggleStackSeriesType(oldSeriesType: SeriesType) {
  switch (oldSeriesType) {
    case 'area':
      return 'area_stacked';
    case 'area_stacked':
      return 'area';
    case 'bar':
      return 'bar_stacked';
    case 'bar_stacked':
      return 'bar';
    default:
      return oldSeriesType;
  }
}

function asPercentageSeriesType(oldSeriesType: SeriesType) {
  switch (oldSeriesType) {
    case 'area_stacked':
      return 'area_percentage_stacked';
    case 'bar_stacked':
      return 'bar_percentage_stacked';
    case 'bar_horizontal_stacked':
      return 'bar_horizontal_percentage_stacked';
    default:
      return oldSeriesType;
  }
}

// Until the area chart rendering bug is fixed, avoid suggesting area charts
// https://github.com/elastic/elastic-charts/issues/388
function altSeriesType(oldSeriesType: SeriesType) {
  switch (oldSeriesType) {
    case 'area':
      return 'line';
    case 'area_stacked':
      return 'bar_stacked';
    case 'bar':
      return 'line';
    case 'bar_stacked':
      return 'line';
    case 'line':
    default:
      return 'bar_stacked';
  }
}

function getSeriesType(
  currentState: XYState | undefined,
  layerId: string,
  xValue?: TableSuggestionColumn
): SeriesType {
  const defaultType = 'bar_stacked';

  const oldLayer = getExistingLayer(currentState, layerId);
  const oldLayerSeriesType = oldLayer && isDataLayer(oldLayer) ? oldLayer.seriesType : false;

  const closestSeriesType =
    oldLayerSeriesType || (currentState && currentState.preferredSeriesType) || defaultType;

  // Attempt to keep the seriesType consistent on initial add of a layer
  // Ordinal scales should always use a bar because there is no interpolation between buckets
  if (xValue && xValue.operation.scale && xValue.operation.scale === 'ordinal') {
    return closestSeriesType.startsWith('bar') ? closestSeriesType : defaultType;
  }

  return closestSeriesType;
}

function getSuggestionTitle(
  yValues: TableSuggestionColumn[],
  xValue: TableSuggestionColumn | undefined,
  tableLabel: string | undefined
) {
  const yTitle = yValues
    .map((col) => col.operation.label)
    .join(
      i18n.translate('xpack.lens.xySuggestions.yAxixConjunctionSign', {
        defaultMessage: ' & ',
        description:
          'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
      })
    );
  const xTitle =
    xValue?.operation.label ||
    i18n.translate('xpack.lens.xySuggestions.emptyAxisTitle', {
      defaultMessage: '(empty)',
    });
  const title =
    tableLabel ||
    (xValue?.operation.dataType === 'date'
      ? i18n.translate('xpack.lens.xySuggestions.dateSuggestion', {
          defaultMessage: '{yTitle} over {xTitle}',
          description:
            'Chart description for charts over time, like "Transfered bytes over log.timestamp"',
          values: { xTitle, yTitle },
        })
      : i18n.translate('xpack.lens.xySuggestions.nonDateSuggestion', {
          defaultMessage: '{yTitle} of {xTitle}',
          description:
            'Chart description for a value of some groups, like "Top URLs of top 5 countries"',
          values: { xTitle, yTitle },
        }));
  return title;
}

function buildSuggestion({
  currentState,
  seriesType,
  layerId,
  title,
  yValues,
  splitBy,
  changeType,
  xValue,
  keptLayerIds,
  hide,
  mainPalette,
}: {
  currentState: XYState | undefined;
  seriesType: SeriesType;
  title: string;
  yValues: TableSuggestionColumn[];
  xValue?: TableSuggestionColumn;
  splitBy: TableSuggestionColumn | undefined;
  layerId: string;
  changeType: TableChangeType;
  keptLayerIds: string[];
  hide?: boolean;
  mainPalette?: PaletteOutput;
}) {
  if (seriesType.includes('percentage') && xValue?.operation.scale === 'ordinal' && !splitBy) {
    splitBy = xValue;
    xValue = undefined;
  }
  const existingLayer = getExistingLayer(currentState, layerId) || null;
  const accessors = yValues.map((col) => col.columnId);
  const newLayer: XYDataLayerConfig = {
    ...(existingLayer || {}),
    palette:
      mainPalette ||
      (existingLayer && 'palette' in existingLayer
        ? (existingLayer as XYDataLayerConfig).palette
        : undefined),
    layerId,
    seriesType,
    xAccessor: xValue?.columnId,
    splitAccessor: splitBy?.columnId,
    accessors,
    yConfig:
      existingLayer && 'yConfig' in existingLayer && existingLayer.yConfig
        ? existingLayer.yConfig.filter(({ forAccessor }) => accessors.indexOf(forAccessor) !== -1)
        : undefined,
    layerType: layerTypes.DATA,
  };

  // Maintain consistent order for any layers that were saved
  const keptLayers: XYLayerConfig[] = currentState
    ? currentState.layers
        // Remove layers that aren't being suggested
        .filter(
          (layer) =>
            keptLayerIds.includes(layer.layerId) || layer.layerType === layerTypes.ANNOTATIONS
        )
        // Update in place
        .map((layer) => (layer.layerId === layerId ? newLayer : layer))
        // Replace the seriesType on all previous layers
        .map((layer) => ({
          ...layer,
          seriesType,
        }))
    : [];

  const state: State = {
    legend: currentState ? currentState.legend : { isVisible: true, position: Position.Right },
    valueLabels: currentState?.valueLabels || 'hide',
    fittingFunction: currentState?.fittingFunction || 'None',
    curveType: currentState?.curveType,
    fillOpacity: currentState?.fillOpacity,
    xTitle: currentState?.xTitle,
    yTitle: currentState?.yTitle,
    yRightTitle: currentState?.yRightTitle,
    hideEndzones: currentState?.hideEndzones,
    valuesInLegend: currentState?.valuesInLegend,
    yLeftExtent: currentState?.yLeftExtent,
    yRightExtent: currentState?.yRightExtent,
    axisTitlesVisibilitySettings: currentState?.axisTitlesVisibilitySettings || {
      x: true,
      yLeft: true,
      yRight: true,
    },
    tickLabelsVisibilitySettings: currentState?.tickLabelsVisibilitySettings || {
      x: true,
      yLeft: true,
      yRight: true,
    },
    labelsOrientation: currentState?.labelsOrientation || {
      x: 0,
      yLeft: 0,
      yRight: 0,
    },
    gridlinesVisibilitySettings: currentState?.gridlinesVisibilitySettings || {
      x: true,
      yLeft: true,
      yRight: true,
    },
    preferredSeriesType: seriesType,
    layers:
      existingLayer && Object.keys(existingLayer).length ? keptLayers : [...keptLayers, newLayer],
  };

  return {
    title,
    score: getScore(yValues, splitBy, changeType),
    hide:
      hide ??
      // Only advertise very clear changes when XY chart is not active
      ((!currentState && changeType !== 'unchanged' && changeType !== 'extended') ||
        // Don't advertise removing dimensions
        (currentState && changeType === 'reduced') ||
        // Don't advertise charts without y axis
        yValues.length === 0 ||
        // Don't advertise charts without at least one split
        (!xValue && !splitBy)),
    state,
    previewIcon: getIconForSeries(seriesType),
  };
}

function getScore(
  yValues: TableSuggestionColumn[],
  splitBy: TableSuggestionColumn | undefined,
  changeType: TableChangeType
) {
  // Unchanged table suggestions half the score because the underlying data doesn't change
  const changeFactor = changeType === 'unchanged' ? 0.5 : 1;
  // chart with multiple y values and split series will have a score of 1, single y value and no split series reduce score
  return (((yValues.length > 1 ? 2 : 1) + (splitBy ? 1 : 0)) / 3) * changeFactor;
}

function getExistingLayer(currentState: XYState | undefined, layerId: string) {
  return currentState && currentState.layers.find((layer) => layer.layerId === layerId);
}
