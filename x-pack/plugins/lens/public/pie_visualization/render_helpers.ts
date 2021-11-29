/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datum, LayerValue } from '@elastic/charts';
import type { Datatable, DatatableColumn } from 'src/plugins/expressions/public';
import type { LensFilterEvent } from '../types';
import type { PieChartTypes } from '../../common/expressions/pie_chart/types';
import type { PaletteDefinition, PaletteOutput } from '../../../../../src/plugins/charts/public';

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

export const isPartitionShape = (shape: PieChartTypes | string) =>
  ['donut', 'pie', 'treemap', 'mosaic'].includes(shape);

export const isTreemapOrMosaicShape = (shape: PieChartTypes | string) =>
  ['treemap', 'mosaic'].includes(shape);

export const extractUniqTermsMap = (dataTable: Datatable, columnId: string) =>
  [...new Set(dataTable.rows.map((item) => item[columnId]))].reduce(
    (acc, item, index) => ({
      ...acc,
      [item]: index,
    }),
    {}
  );

export const byDataColorPaletteMap = (
  dataTable: Datatable,
  columnId: string,
  paletteDefinition: PaletteDefinition,
  { params }: PaletteOutput
) => {
  const colorMap = new Map<string, string | undefined>(
    dataTable.rows.map((item) => [String(item[columnId]), undefined])
  );
  let rankAtDepth = 0;

  return {
    getColor: (item: unknown) => {
      const key = String(item);

      if (colorMap.has(key)) {
        let color = colorMap.get(key);

        if (color) {
          return color;
        }
        color =
          paletteDefinition.getCategoricalColor(
            [
              {
                name: key,
                totalSeriesAtDepth: colorMap.size,
                rankAtDepth: rankAtDepth++,
              },
            ],
            {
              behindText: false,
            },
            params
          ) || undefined;

        colorMap.set(key, color);
        return color;
      }
    },
  };
};
