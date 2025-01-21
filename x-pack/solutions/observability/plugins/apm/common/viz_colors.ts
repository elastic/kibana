/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

function getVizColorsForTheme(euiTheme: EuiThemeComputed) {
  return [
    euiTheme.colors.vis.euiColorVis0,
    euiTheme.colors.vis.euiColorVis1,
    euiTheme.colors.vis.euiColorVis2,
    euiTheme.colors.vis.euiColorVis3,
    euiTheme.colors.vis.euiColorVis4,
    euiTheme.colors.vis.euiColorVis5,
    euiTheme.colors.vis.euiColorVis6,
    euiTheme.colors.vis.euiColorVis7,
    euiTheme.colors.vis.euiColorVis8,
    euiTheme.colors.vis.euiColorVis9,
  ];
}

export function getVizColorForIndex(index = 0, euiTheme: EuiThemeComputed) {
  const colors = getVizColorsForTheme(euiTheme);
  return colors[index % colors.length];
}
