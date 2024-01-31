/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

interface FlyoutColumnWidth {
  columns: 1 | 2 | 3;
  fieldWidth: number;
}

export const useFlyoutColumnWidth = (width: number): FlyoutColumnWidth => {
  const { euiTheme } = useEuiTheme();

  const numberOfColumns = width > euiTheme.breakpoint.m ? 3 : width > euiTheme.breakpoint.s ? 2 : 1;
  const WIDTH_FACTOR = 1.25;
  const fieldWidth = width / (numberOfColumns * WIDTH_FACTOR);

  return {
    columns: numberOfColumns,
    fieldWidth,
  };
};
