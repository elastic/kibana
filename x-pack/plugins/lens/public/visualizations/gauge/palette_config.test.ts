/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentizePalettes } from './palette_config';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';

const paletteServiceMock = chartPluginMock.createPaletteRegistry();

describe('transparentizePalettes', () => {
  it('converts all colors to half-transparent', () => {
    const newPalettes = transparentizePalettes(paletteServiceMock);

    const singlePalette = newPalettes.get('mocked');
    expect(singlePalette.getCategoricalColors(2)).toEqual(['#0000FF80', '#FFFF0080']);
    expect(
      singlePalette.getCategoricalColor([
        {
          name: 'abc',
          rankAtDepth: 0,
          totalSeriesAtDepth: 5,
        },
      ])
    ).toEqual('#0000FF80');

    const firstPalette = newPalettes.getAll()[0];
    expect(firstPalette.getCategoricalColors(2)).toEqual(['#FF000080', '#00000080']);
    expect(
      firstPalette.getCategoricalColor([
        {
          name: 'abc',
          rankAtDepth: 0,
          totalSeriesAtDepth: 5,
        },
      ])
    ).toEqual('#00000080');
  });
});
