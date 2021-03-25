/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-shared-deps/theme';

import { stringHash } from './string_utils';

const COLORS = [
  euiThemeVars.euiColorVis0,
  euiThemeVars.euiColorVis1,
  euiThemeVars.euiColorVis2,
  euiThemeVars.euiColorVis3,
  euiThemeVars.euiColorVis4,
  euiThemeVars.euiColorVis5,
  euiThemeVars.euiColorVis6,
  euiThemeVars.euiColorVis7,
  euiThemeVars.euiColorVis8,
  euiThemeVars.euiColorVis9,
  euiThemeVars.euiColorDarkShade,
  euiThemeVars.euiColorPrimary,
];

const colorMap: Record<string, string> = {};

export function tabColor(name: string): string {
  if (colorMap[name] === undefined) {
    const n = stringHash(name);
    const color = COLORS[n % COLORS.length];
    colorMap[name] = color;
    return color;
  } else {
    return colorMap[name];
  }
}
