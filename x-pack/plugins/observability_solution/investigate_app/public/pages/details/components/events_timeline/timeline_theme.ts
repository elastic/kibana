/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialTheme } from '@elastic/charts';

export const TIME_LINE_THEME: PartialTheme = {
  highlighter: {
    point: {
      opacity: 0,
    },
  },
  axes: {
    gridLine: {
      horizontal: {
        visible: false,
      },
      vertical: {
        visible: false,
      },
    },
    axisLine: {
      strokeWidth: 1,
      stroke: '#98A2B3',
    },
  },
  chartMargins: {
    bottom: 10,
    top: 10,
  },
  areaSeriesStyle: {
    area: {
      visible: false,
    },
    line: {
      visible: false,
    },
  },
  lineAnnotation: {
    line: {
      opacity: 0,
    },
  },
};
