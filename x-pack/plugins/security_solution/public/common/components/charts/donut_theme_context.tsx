/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { PartialTheme } from '@elastic/charts';

const donutTheme: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    linkLabel: {
      maximumSection: Infinity,
    },
    idealFontSizeJump: 1.1,
    outerSizeRatio: 0.9,
    emptySizeRatio: 0.4,
    circlePadding: 4,
  },
};

const defaultContext = {
  colors: ['#EF6550', '#EE9266', '#F3B689', '#F8D9B2'],
  chartTheme: {
    theme: donutTheme,
  },
};

export const ThemeContext = createContext(defaultContext);
