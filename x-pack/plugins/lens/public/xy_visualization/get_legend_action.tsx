/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LegendAction, XYChartSeriesIdentifier } from '@elastic/charts';
import type { LensFilterEvent } from '../types';
import type { LensMultiTable, FormatFactory } from '../../common';
import type { DataLayerArgs } from '../../common/expressions';
import { LegendActionPopover } from '../shared_components';

export const getLegendAction = (
  filteredLayers: DataLayerArgs[],
  tables: LensMultiTable['tables'],
  onFilter: (data: LensFilterEvent['data']) => void,
  formatFactory: FormatFactory,
  layersAlreadyFormatted: Record<string, boolean>
): LegendAction =>
  React.memo(({ series: [xySeries] }) => {
    const series = xySeries as XYChartSeriesIdentifier;
    const layer = filteredLayers.find((l) =>
      series.seriesKeys.some((key: string | number) => l.accessors.includes(key.toString()))
    );

    if (!layer || !layer.splitAccessor) {
      return null;
    }

    const splitLabel = series.seriesKeys[0] as string;
    const accessor = layer.splitAccessor;

    const table = tables[layer.layerId];
    const splitColumn = table.columns.find(({ id }) => id === layer.splitAccessor);
    const formatter = formatFactory(splitColumn && splitColumn.meta?.params);

    const rowIndex = table.rows.findIndex((row) => {
      if (layersAlreadyFormatted[accessor]) {
        // stringify the value to compare with the chart value
        return formatter.convert(row[accessor]) === splitLabel;
      }
      return row[accessor] === splitLabel;
    });

    if (rowIndex < 0) return null;

    const data = [
      {
        row: rowIndex,
        column: table.columns.findIndex((col) => col.id === accessor),
        value: accessor ? table.rows[rowIndex][accessor] : splitLabel,
        table,
      },
    ];

    const context: LensFilterEvent['data'] = {
      data,
    };

    return (
      <LegendActionPopover
        label={
          !layersAlreadyFormatted[accessor] && formatter
            ? formatter.convert(splitLabel)
            : splitLabel
        }
        context={context}
        onFilter={onFilter}
      />
    );
  });
