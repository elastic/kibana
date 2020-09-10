/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import {
  SuggestionRequest,
  VisualizationSuggestion,
  TableSuggestionColumn,
  TableSuggestion,
  TableChangeType,
} from '../types';
import { State, SeriesType, XYState, visualizationTypes, LayerConfig } from './types';
import { getIconForSeries } from './state_helpers';

const columnSortOrder = {
  document: 0,
  date: 1,
  string: 2,
  ip: 3,
  boolean: 4,
  number: 5,
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
}: SuggestionRequest<State>): Array<VisualizationSuggestion<State>> {
  if (
    // We only render line charts for multi-row queries. We require at least
    // two columns: one for x and at least one for y, and y columns must be numeric.
    // We reject any datasource suggestions which have a column of an unknown type.
    !table.isMultiRow ||
    table.columns.length <= 1 ||
    table.columns.every((col) => col.operation.dataType !== 'number') ||
    table.columns.some((col) => !columnSortOrder.hasOwnProperty(col.operation.dataType))
  ) {
    return [];
  }

  const suggestions = getSuggestionForColumns(table, keptLayerIds, state);

  if (suggestions && suggestions instanceof Array) {
    return suggestions;
  }

  return suggestions ? [suggestions] : [];
}

function getSuggestionForColumns(
  table: TableSuggestion,
  keptLayerIds: string[],
  currentState?: State
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
    });
  } else if (buckets.length === 0) {
    const [x, ...yValues] = prioritizeColumns(values);
    return getSuggestionsForLayer({
      layerId: table.layerId,
      changeType: table.changeType,
      xValue: x,
      yValues,
      splitBy: undefined,
      currentState,
      tableLabel: table.label,
      keptLayerIds,
    });
  }
}

function getBucketMappings(table: TableSuggestion, currentState?: State) {
  const currentLayer =
    currentState && currentState.layers.find(({ layerId }) => layerId === table.layerId);

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
}: {
  layerId: string;
  changeType: TableChangeType;
  xValue: TableSuggestionColumn;
  yValues: TableSuggestionColumn[];
  splitBy?: TableSuggestionColumn;
  currentState?: State;
  tableLabel?: string;
  keptLayerIds: string[];
}): VisualizationSuggestion<State> | Array<VisualizationSuggestion<State>> {
  const title = getSuggestionTitle(yValues, xValue, tableLabel);
  const seriesType: SeriesType = getSeriesType(currentState, layerId, xValue, changeType);

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
  };

  // handles the simplest cases, acting as a chart switcher
  if (!currentState && changeType === 'unchanged') {
    // Chart switcher needs to include every chart type
    return visualizationTypes
      .map((visType) => ({
        ...buildSuggestion({ ...options, seriesType: visType.id as SeriesType }),
        title: visType.label,
        hide: visType.id !== 'bar_stacked',
      }))
      .sort((a, b) => (a.state.preferredSeriesType === 'bar_stacked' ? -1 : 1));
  }

  const isSameState = currentState && changeType === 'unchanged';
  if (!isSameState) {
    return buildSuggestion(options);
  }

  // Suggestions are either changing the data, or changing the way the data is used
  const sameStateSuggestions: Array<VisualizationSuggestion<State>> = [];

  // if current state is using the same data, suggest same chart with different presentational configuration
  if (seriesType !== 'line' && xValue.operation.scale === 'ordinal') {
    // flip between horizontal/vertical for ordinal scales
    sameStateSuggestions.push(
      buildSuggestion({
        ...options,
        title: i18n.translate('xpack.lens.xySuggestions.flipTitle', { defaultMessage: 'Flip' }),
        seriesType:
          seriesType === 'bar_horizontal'
            ? 'bar'
            : seriesType === 'bar_horizontal_stacked'
            ? 'bar_stacked'
            : 'bar_horizontal',
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

  if (seriesType !== 'line' && splitBy) {
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
  xValue: TableSuggestionColumn,
  changeType: TableChangeType
): SeriesType {
  const defaultType = 'bar_stacked';

  const oldLayer = getExistingLayer(currentState, layerId);
  const oldLayerSeriesType = oldLayer ? oldLayer.seriesType : false;

  const closestSeriesType =
    oldLayerSeriesType || (currentState && currentState.preferredSeriesType) || defaultType;

  // Attempt to keep the seriesType consistent on initial add of a layer
  // Ordinal scales should always use a bar because there is no interpolation between buckets
  if (xValue.operation.scale && xValue.operation.scale === 'ordinal') {
    return closestSeriesType.startsWith('bar') ? closestSeriesType : defaultType;
  }

  return closestSeriesType;
}

function getSuggestionTitle(
  yValues: TableSuggestionColumn[],
  xValue: TableSuggestionColumn,
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
  const xTitle = xValue.operation.label;
  const title =
    tableLabel ||
    (xValue.operation.dataType === 'date'
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
}: {
  currentState: XYState | undefined;
  seriesType: SeriesType;
  title: string;
  yValues: TableSuggestionColumn[];
  xValue: TableSuggestionColumn;
  splitBy: TableSuggestionColumn | undefined;
  layerId: string;
  changeType: TableChangeType;
  keptLayerIds: string[];
}) {
  const existingLayer: LayerConfig | {} = getExistingLayer(currentState, layerId) || {};
  const accessors = yValues.map((col) => col.columnId);
  const newLayer = {
    ...existingLayer,
    layerId,
    seriesType,
    xAccessor: xValue.columnId,
    splitAccessor: splitBy?.columnId,
    accessors,
    yConfig:
      'yConfig' in existingLayer && existingLayer.yConfig
        ? existingLayer.yConfig.filter(({ forAccessor }) => accessors.indexOf(forAccessor) !== -1)
        : undefined,
  };

  // Maintain consistent order for any layers that were saved
  const keptLayers = currentState
    ? currentState.layers
        // Remove layers that aren't being suggested
        .filter((layer) => keptLayerIds.includes(layer.layerId))
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
    fittingFunction: currentState?.fittingFunction || 'None',
    xTitle: currentState?.xTitle,
    yTitle: currentState?.yTitle,
    showXAxisTitle: currentState?.showXAxisTitle ?? true,
    showYAxisTitle: currentState?.showYAxisTitle ?? true,
    tickLabelsVisibilitySettings: currentState?.tickLabelsVisibilitySettings || {
      x: true,
      y: true,
    },
    gridlinesVisibilitySettings: currentState?.gridlinesVisibilitySettings || {
      x: true,
      y: true,
    },
    preferredSeriesType: seriesType,
    layers: Object.keys(existingLayer).length ? keptLayers : [...keptLayers, newLayer],
  };

  return {
    title,
    score: getScore(yValues, splitBy, changeType),
    hide:
      // Only advertise very clear changes when XY chart is not active
      (!currentState && changeType !== 'unchanged' && changeType !== 'extended') ||
      // Don't advertise removing dimensions
      (currentState && changeType === 'reduced'),
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
