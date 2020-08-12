/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuggestionRequest, VisualizationSuggestion, TableSuggestion } from '../types';
import { State } from './types';
import chartMetricSVG from '../assets/chart_metric.svg';

/**
 * Given a set of parameters, return suggestions, if possible.
 *
 * table = metadata describing the shape of the table which the datasource is suggesting
 * state = the currently configured state of the metric visualization (may be null, if metric
 *   is not the current visualization type being edited in Lens)
 * keptLayerIds = the list of layers which are being used in the suggestion. The metric visualization
 *   only supports one layer.
 */
export function getSuggestions({
  table,
  state,
  keptLayerIds,
}: SuggestionRequest<State>): Array<VisualizationSuggestion<State>> {
  // We only render metric charts for single-row queries. We require a single, numeric column.
  if (
    table.isMultiRow ||
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.columns.length !== 1 ||
    table.columns[0].operation.dataType !== 'number'
  ) {
    return [];
  }

  // don't suggest current table if visualization is active
  if (state && table.changeType === 'unchanged') {
    return [];
  }

  return [getSuggestion(table)];
}

function getSuggestion(table: TableSuggestion): VisualizationSuggestion<State> {
  const col = table.columns[0];
  const title = table.label || col.operation.label;

  return {
    // Human-friendly descriptive text
    title,
    // A number from 0-1 which Lens uses to prioritize
    // suggestions from least (0) to most (1) relevant.
    score: 0.1,
    // The icon used in the visualization switcher UI.
    previewIcon: chartMetricSVG,
    // If this suggestion is chosen / used by Lens, this
    // will become the metric visualization's internal state.
    state: {
      layerId: table.layerId,
      accessor: col.columnId,
    },
  };
}
