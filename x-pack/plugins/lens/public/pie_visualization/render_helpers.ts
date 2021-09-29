/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datum, LayerValue } from '@elastic/charts';
import { Datatable, DatatableColumn } from 'src/plugins/expressions/public';
import { LensFilterEvent } from '../types';

export function getSliceValue(d: Datum, metricColumn: DatatableColumn) {
  const value = d[metricColumn.id];
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function getFilterContext(
  clickedLayers: LayerValue[],
  layerColumnIds: string[],
  table: Datatable
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
