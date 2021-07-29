/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { PointSeriesColumns, DatatableRow, Ticks } from '../../../types';

export const getTickHash = (columns: PointSeriesColumns, rows: DatatableRow[]) => {
  const ticks: Ticks = {
    x: {
      hash: {},
      counter: 0,
    },
    y: {
      hash: {},
      counter: 0,
    },
  };

  if (get(columns, 'x.type') === 'string') {
    rows.forEach((row) => {
      if (!ticks.x.hash[row.x]) {
        ticks.x.hash[row.x] = ticks.x.counter++;
      }
    });
  }

  if (get(columns, 'y.type') === 'string') {
    rows.reverse().forEach((row) => {
      if (!ticks.y.hash[row.y]) {
        ticks.y.hash[row.y] = ticks.y.counter++;
      }
    });
  }

  return ticks;
};
