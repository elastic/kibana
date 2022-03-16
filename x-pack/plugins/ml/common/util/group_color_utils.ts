/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars as euiVars } from '@kbn/ui-theme';

import { stringHash } from './string_utils';

const COLORS = [
  euiVars.euiColorVis0,
  euiVars.euiColorVis1,
  euiVars.euiColorVis2,
  euiVars.euiColorVis3,
  euiVars.euiColorVis4,
  euiVars.euiColorVis5,
  euiVars.euiColorVis6,
  euiVars.euiColorVis7,
  euiVars.euiColorVis8,
  euiVars.euiColorVis9,
  euiVars.euiColorDarkShade,
  euiVars.euiColorPrimary,
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
