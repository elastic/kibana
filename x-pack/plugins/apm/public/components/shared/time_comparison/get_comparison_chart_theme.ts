/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialTheme } from '@elastic/charts';

export function getComparisonChartTheme(): PartialTheme {
  return {
    areaSeriesStyle: {
      area: {
        visible: true,
        opacity: 0.5,
      },
      line: {
        strokeWidth: 1,
        visible: true,
      },
      point: {
        visible: false,
      },
    },
  };
}
