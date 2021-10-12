/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialTheme } from "@elastic/charts";

export const chartThemeOverrides: PartialTheme = {
  chartMargins: {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  },
  background: {
    color: 'transparent',
  },
  lineSeriesStyle: {
    point: { visible: false },
  },
  areaSeriesStyle: {
    point: { visible: false },
  },
};
