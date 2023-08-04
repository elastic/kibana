/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPalettePositive } from '@elastic/eui';

export const coverageOverviewPaletteColors = euiPalettePositive(5);

export const coverageOverviewPanelWidth = 160;

export const coverageOverviewLegendWidth = 380;

export const coverageOverviewCardColorThresholds = [
  { threshold: 10, color: coverageOverviewPaletteColors[3] },
  { threshold: 7, color: coverageOverviewPaletteColors[2] },
  { threshold: 3, color: coverageOverviewPaletteColors[1] },
  { threshold: 1, color: coverageOverviewPaletteColors[0] },
];
