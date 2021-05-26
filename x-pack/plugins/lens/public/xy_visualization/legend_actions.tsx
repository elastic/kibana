/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiContextMenuPanelDescriptor, EuiIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import type { LegendAction, XYChartSeriesIdentifier } from '@elastic/charts';
import type { LayerArgs } from './types';
import type { LensMultiTable, LensFilterEvent, FormatFactory } from '../types';

export const getLegendActions = (
  filteredLayers: LayerArgs[],
  tables: LensMultiTable['tables'],
  onFilter: (data: LensFilterEvent['data']) => void,
  formatFactory: FormatFactory
): LegendAction => ({ series: [xySeries], label }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
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
  const splitColumn = table.columns.find((col) => col.id === accessor);

  const formatter = splitColumn ? formatFactory(splitColumn.meta.params) : null;

  const rowIndex = table.rows.findIndex((row) => {
    if (formatter) {
      // stringify the value to compare with the chart value
      return formatter.convert(row[accessor]) === splitLabel;
    }
    return row[accessor] === splitLabel;
  });

  if (rowIndex < 0) return null;

  const points = [
    {
      row: rowIndex,
      column: table.columns.findIndex((col) => col.id === accessor),
      value: accessor ? table.rows[rowIndex][accessor] : splitLabel,
    },
  ];

  const context: LensFilterEvent['data'] = {
    data: points.map((point) => ({
      row: point.row,
      column: point.column,
      value: point.value,
      table,
    })),
  };

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 'main',
      title: `${splitLabel}`,
      items: [
        {
          name: i18n.translate('visTypeXy.legend.filterForValueButtonAriaLabel', {
            defaultMessage: 'Filter for value',
          }),
          'data-test-subj': `legend-${splitLabel}-filterIn`,
          icon: <EuiIcon type="plusInCircle" size="m" />,
          onClick: () => {
            setPopoverOpen(false);
            onFilter(context);
          },
        },
        {
          name: i18n.translate('visTypeXy.legend.filterOutValueButtonAriaLabel', {
            defaultMessage: 'Filter out value',
          }),
          'data-test-subj': `legend-${splitLabel}-filterOut`,
          icon: <EuiIcon type="minusInCircle" size="m" />,
          onClick: () => {
            setPopoverOpen(false);
            onFilter({ ...context, negate: true });
          },
        },
      ],
    },
  ];

  const Button = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        marginLeft: 4,
        marginRight: 4,
      }}
      data-test-subj={`legend-${splitLabel}`}
      onKeyPress={() => undefined}
      onClick={() => setPopoverOpen(!popoverOpen)}
    >
      <EuiIcon size="s" type="boxesVertical" />
    </div>
  );

  return (
    <EuiPopover
      id="contextMenuNormal"
      button={Button}
      isOpen={popoverOpen}
      closePopover={() => setPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="upLeft"
      title={i18n.translate('visTypeXy.legend.filterOptionsLegend', {
        defaultMessage: '{legendDataLabel}, filter options',
        values: { legendDataLabel: splitLabel },
      })}
    >
      <EuiContextMenu initialPanelId="main" panels={panels} />
    </EuiPopover>
  );
};
