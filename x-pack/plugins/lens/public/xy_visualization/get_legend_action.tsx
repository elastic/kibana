/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LegendAction, XYChartSeriesIdentifier } from '@elastic/charts';
import type { LayerArgs } from './types';
import type { LensMultiTable, LensFilterEvent } from '../types';
import { LegendActionPopover } from '../shared_components';

export const getLegendAction = (
  filteredLayers: LayerArgs[],
  tables: LensMultiTable['tables'],
  onFilter: (data: LensFilterEvent['data']) => void
): LegendAction => ({ series: [xySeries], label }) => {
  const series = xySeries as XYChartSeriesIdentifier;
  const layer = filteredLayers.find((l) =>
    series.seriesKeys.some((key: string | number) => l.accessors.includes(key.toString()))
  );

  if (!layer || !layer.splitAccessor) {
    return null;
  }

  let splitLabel = label;
  const accessor = layer.splitAccessor;
  const hasMultipleYaxis = layer.accessors.length > 1;
  if (hasMultipleYaxis) {
    [splitLabel] = label.split(' - ');
  }

  const table = tables[layer.layerId];

  const rowIndex = table.rows.findIndex((row) => {
    return row[accessor] === series.seriesKeys[0];
  });

  if (rowIndex < 0) return null;

  const data = [
    {
      row: rowIndex,
      column: table.columns.findIndex((col) => col.id === accessor),
      value: accessor ? table.rows[rowIndex][accessor] : series.seriesKeys[0],
      table,
    },
  ];

  const context: LensFilterEvent['data'] = {
    data,
  };

  return <LegendActionPopover label={splitLabel} context={context} onFilter={onFilter} />;
};
