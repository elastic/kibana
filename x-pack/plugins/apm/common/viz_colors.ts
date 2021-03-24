/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// On the client you import theme variables with:
//
//    import { euiThemeVars } from '@kbn/ui-shared-deps/theme';
//
// This import does not work on the server, so we import directly from one of
// the theme JSON files from EUI. See https://github.com/elastic/kibana/issues/70161.
import euiThemeVars from '@elastic/eui/dist/eui_theme_light.json';

// Re-export the colors for individual use in other server modules
export const euiColorVis0 = euiThemeVars.euiColorVis0;
export const euiColorVis1 = euiThemeVars.euiColorVis1;
export const euiColorVis2 = euiThemeVars.euiColorVis2;
export const euiColorVis3 = euiThemeVars.euiColorVis3;
export const euiColorVis4 = euiThemeVars.euiColorVis4;
export const euiColorVis5 = euiThemeVars.euiColorVis5;
export const euiColorVis6 = euiThemeVars.euiColorVis6;
export const euiColorVis7 = euiThemeVars.euiColorVis7;
export const euiColorVis8 = euiThemeVars.euiColorVis8;
export const euiColorVis9 = euiThemeVars.euiColorVis9;

function getVizColorsForTheme(theme = euiThemeVars) {
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

export function getVizColorForIndex(index = 0, theme = euiThemeVars) {
  const colors = getVizColorsForTheme(theme);
  return colors[index % colors.length];
}
