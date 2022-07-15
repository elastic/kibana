/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Theme } from '@elastic/charts';
import { RecursivePartial } from '@elastic/eui';

export const chartTheme: RecursivePartial<Theme> = {
  barSeriesStyle: {
    rectBorder: {
      strokeOpacity: 1,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 0.6,
    },
  },
  scales: {
    barsPadding: 0,
    histogramPadding: 0,
  },
};
