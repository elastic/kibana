/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChartColorConfiguration,
  PaletteDefinition,
  PaletteRegistry,
  SeriesLayer,
  RequiredPaletteParamTypes,
} from '@kbn/coloring';

import Color from 'color';
import { defaultPaletteParams as sharedDefaultParams } from '../../shared_components/';

export const DEFAULT_PALETTE_NAME = 'gray';
export const DEFAULT_COLOR_STEPS = 3;
export const DEFAULT_MIN_STOP = 0;
export const DEFAULT_MAX_STOP = 100;

export const defaultPaletteParams: RequiredPaletteParamTypes = {
  ...sharedDefaultParams,
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  name: DEFAULT_PALETTE_NAME,
  steps: DEFAULT_COLOR_STEPS,
  maxSteps: 5,
};

export const transparentizePalettes = (palettes: PaletteRegistry) => {
  const addAlpha = (c: string | null) => (c ? new Color(c).hex() + `80` : `000000`);
  const transparentizePalette = (palette: PaletteDefinition<unknown>) => ({
    ...palette,
    getCategoricalColor: (
      series: SeriesLayer[],
      chartConfiguration?: ChartColorConfiguration,
      state?: unknown
    ) => addAlpha(palette.getCategoricalColor(series, chartConfiguration, state)),
    getCategoricalColors: (size: number, state?: unknown): string[] =>
      palette.getCategoricalColors(size, state).map(addAlpha),
  });

  return {
    ...palettes,
    get: (name: string) => transparentizePalette(palettes.get(name)),
    getAll: () => palettes.getAll().map((singlePalette) => transparentizePalette(singlePalette)),
  };
};
