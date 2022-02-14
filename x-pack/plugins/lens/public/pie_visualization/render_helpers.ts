/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from 'src/plugins/expressions/public';
import type { PieChartType, PieLayerState } from '../../common/types';
import { PartitionChartsMeta } from './partition_charts_meta';

export const isPartitionShape = (shape: PieChartType | string) =>
  ['donut', 'pie', 'treemap', 'mosaic', 'waffle'].includes(shape);

export const shouldShowValuesInLegend = (layer: PieLayerState, shape: PieChartType) => {
  if ('showValues' in PartitionChartsMeta[shape]?.legend) {
    return layer.showValuesInLegend ?? PartitionChartsMeta[shape]?.legend?.showValues ?? true;
  }

  return false;
};

export const checkTableForContainsSmallValues = (
  dataTable: Datatable,
  columnId: string,
  minPercentage: number
) => {
  const overallSum = dataTable.rows.reduce(
    (partialSum, row) => Number(row[columnId]) + partialSum,
    0
  );
  return dataTable.rows.some((row) => (row[columnId] / overallSum) * 100 < minPercentage);
};
