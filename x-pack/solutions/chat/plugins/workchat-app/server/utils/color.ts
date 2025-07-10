/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

export const getRandomColorFromPalette = (): string => {
  const palette = euiPaletteColorBlind();
  return palette[Math.floor(Math.random() * palette.length)];
};
