/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_LEGEND,
  NETWORK_LABEL,
  RX_LABEL,
  TX_LABEL,
} from '../../../shared/charts/constants';

const rxTx: LensConfigWithId = {
  id: 'rxTx',
  chartType: 'xy',
  title: NETWORK_LABEL,
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        {
          ...formulas.rx,
          label: RX_LABEL,
        },
        {
          ...formulas.tx,
          label: TX_LABEL,
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const rx: LensConfigWithId = {
  id: 'rx',
  chartType: 'xy',
  title: formulas.rx.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.rx],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const tx: LensConfigWithId = {
  id: 'tx',
  chartType: 'xy',
  title: formulas.tx.label ?? '',
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.tx],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

export const network = {
  xy: {
    rxTx,
    rx,
    tx,
  },
} as const;
