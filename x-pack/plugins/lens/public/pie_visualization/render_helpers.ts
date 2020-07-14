/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datum, LayerValue } from '@elastic/charts';
import { KibanaDatatable, KibanaDatatableColumn } from 'src/plugins/expressions/public';
import { ColumnGroups } from './types';
import { LensFilterEvent } from '../types';

export function getSliceValueWithFallback(
  d: Datum,
  reverseGroups: ColumnGroups,
  metricColumn: KibanaDatatableColumn
) {
  if (typeof d[metricColumn.id] === 'number' && d[metricColumn.id] !== 0) {
    return d[metricColumn.id];
  }
  // Sometimes there is missing data for outer groups
  // When there is missing data, we fall back to the next groups
  // This creates a sunburst effect
  const hasMetric = reverseGroups.find((group) => group.metrics.length && d[group.metrics[0].id]);
  return hasMetric ? d[hasMetric.metrics[0].id] || Number.EPSILON : Number.EPSILON;
}

export function getFilterContext(
  clickedLayers: LayerValue[],
  layerColumnIds: string[],
  table: KibanaDatatable
): LensFilterEvent['data'] {
  const matchingIndex = table.rows.findIndex((row) =>
    clickedLayers.every((layer, index) => {
      const columnId = layerColumnIds[index];
      return row[columnId] === layer.groupByRollup;
    })
  );

  return {
    data: clickedLayers.map((clickedLayer, index) => ({
      column: table.columns.findIndex((col) => col.id === layerColumnIds[index]),
      row: matchingIndex,
      value: clickedLayer.groupByRollup,
      table,
    })),
  };
}
