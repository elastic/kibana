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
  const widthFactor = numberOfColumns === 3 ? 2.5 : 2.2;
  const fieldWidth = width / (numberOfColumns * widthFactor);

  return {
    columns: numberOfColumns,
    fieldWidth,
  };
};
