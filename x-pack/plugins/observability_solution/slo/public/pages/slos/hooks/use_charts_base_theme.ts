/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PartialTheme } from '@elastic/charts';
import { useKibana } from '../../../utils/kibana_react';

export function useChartsBaseTheme() {
  const { charts } = useKibana().services;
  const baseTheme = charts.theme.useChartsBaseTheme();

  const theme: PartialTheme = {
    legend: {
      horizontalHeight: 32,
      margin: 0,
      verticalWidth: 128,
    },
  };

  return { baseTheme, theme };
}
