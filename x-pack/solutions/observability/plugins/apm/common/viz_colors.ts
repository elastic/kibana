/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as lightTheme } from '@kbn/ui-theme';

function getVizColorsForTheme(theme = lightTheme) {
  return [
    theme.euiColorVis0,
    theme.euiColorVis1,
    theme.euiColorVis2,
    theme.euiColorVis3,
    theme.euiColorVis4,
    theme.euiColorVis5,
    theme.euiColorVis6,
    theme.euiColorVis7,
    theme.euiColorVis8,
    theme.euiColorVis9,
  ];
}

export function getVizColorForIndex(index = 0, theme = lightTheme) {
  const colors = getVizColorsForTheme(theme);
  return colors[index % colors.length];
}
