/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiContextMenuPanelDescriptor, EuiIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import type { LegendAction } from '@elastic/charts';
import type { Datatable } from 'src/plugins/expressions/public';
import type { LensFilterEvent } from '../types';

export const getLegendAction = (
  table: Datatable,
  onFilter: (data: LensFilterEvent['data']) => void
): LegendAction => ({ series: [pieSeries], label }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const data = table.columns.reduce<LensFilterEvent['data']['data']>((acc, { id }, column) => {
    const value = pieSeries.key;
    const row = table.rows.findIndex((r) => r[id] === value);
    if (row > -1) {
      acc.push({
        table,
        column,
        row,
        value,
      });
    }

    return acc;
  }, []);

  if (data.length === 0) {
    return null;
  }

  const context: LensFilterEvent['data'] = {
    data,
  };

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 'main',
      title: `${label}`,
      items: [
        {
          name: i18n.translate('xpack.lens.xyChart.legend.filterForValueButtonAriaLabel', {
            defaultMessage: 'Filter for value',
          }),
          'data-test-subj': `legend-${label}-filterIn`,
          icon: <EuiIcon type="plusInCircle" size="m" />,
          onClick: () => {
            setPopoverOpen(false);
            onFilter(context);
          },
        },
        {
          name: i18n.translate('xpack.lens.xyChart.legend.filterOutValueButtonAriaLabel', {
            defaultMessage: 'Filter out value',
          }),
          'data-test-subj': `legend-${label}-filterOut`,
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
      data-test-subj={`legend-${label}`}
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
      title={i18n.translate('xpack.lens.xyChart.legend.filterOptionsLegend', {
        defaultMessage: '{legendDataLabel}, filter options',
        values: { legendDataLabel: label },
      })}
    >
      <EuiContextMenu initialPanelId="main" panels={panels} />
    </EuiPopover>
  );
};
