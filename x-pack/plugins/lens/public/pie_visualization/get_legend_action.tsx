/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { LegendAction } from '@elastic/charts';
import type { Datatable } from 'src/plugins/expressions/public';
import type { LensFilterEvent } from '../types';
import { LegendActionPopover } from '../shared_components';

export const getLegendAction = (
  table: Datatable,
  onFilter: (data: LensFilterEvent['data']) => void
): LegendAction =>
  React.memo(({ series: [pieSeries], label }) => {
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

    return <LegendActionPopover label={label} context={context} onFilter={onFilter} />;
  });
