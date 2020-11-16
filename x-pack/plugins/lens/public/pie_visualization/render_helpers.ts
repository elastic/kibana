/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datum, LayerValue } from '@elastic/charts';
import { KibanaDatatable, KibanaDatatableColumn } from 'src/plugins/expressions/public';
import { LensFilterEvent } from '../types';

export function getSliceValue(d: Datum, metricColumn: KibanaDatatableColumn) {
  if (typeof d[metricColumn.id] === 'number' && d[metricColumn.id] !== 0) {
    return d[metricColumn.id];
  }
  return Number.EPSILON;
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
