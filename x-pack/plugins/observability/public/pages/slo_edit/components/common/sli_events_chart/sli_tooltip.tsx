/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Tooltip, TooltipTable, TooltipTableColumn } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
const columns: TooltipTableColumn[] = [
  {
    id: 'color',
    type: 'color',
  },
  {
    id: 'label',
    type: 'custom',
    truncate: true,
    cell: ({ label }) => <span className="echTooltip__label">{label}</span>,
    style: {
      textAlign: 'left',
    },
  },
  {
    id: 'value',
    type: 'custom',
    cell: ({ formattedValue }) => (
      <>
        <span className="echTooltip__value" dir="ltr">
          {formattedValue}
        </span>
      </>
    ),
    style: {
      textAlign: 'right',
    },
  },
];
export function SLITooltip() {
  return (
    <Tooltip
      type="vertical"
      body={({ items }) => {
        const firstItem = items[0];
        const events = firstItem.datum.events;
        const rows = [items[0]];
        if (events) {
          rows.push({
            ...firstItem,
            formattedValue: events.good,
            value: events.good,
            label: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.goodEvents', {
              defaultMessage: 'Good events',
            }),
          });
          rows.push({
            ...firstItem,
            value: events.total,
            formattedValue: events.total,
            label: i18n.translate('xpack.observability.slo.sloEdit.dataPreviewChart.badEvents', {
              defaultMessage: 'Total events',
            }),
          });
        }

        return <TooltipTable columns={columns} items={rows} />;
      }}
    />
  );
}
