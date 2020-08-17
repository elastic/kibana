/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { LibStrings } from '../../i18n';

const { Palettes: strings } = LibStrings;

/**
 * This type contains a unions of all supported palette ids.
 */
export type PaletteID = typeof palettes[number]['id'];

/**
 * An interface representing a color palette in Canvas, with a textual label and a set of
 * hex values.
 */
export interface ColorPalette {
  id: PaletteID;
  label: string;
  colors: string[];
  gradient: boolean;
}

// This function allows one to create a strongly-typed palette for inclusion in
// the palette collection.  As a result, the values and labels are known to the
// type system, preventing one from specifying a non-existent palette at build
// time.
function createPalette<
  RawPalette extends {
    id: RawPaletteID;
  },
  RawPaletteID extends string
>(palette: RawPalette) {
  return palette;
}

/**
 * Return a palette given a set of colors and gradient.  Returns undefined if the
 * palette doesn't match.
 */
export const identifyPalette = (
  input: Pick<ColorPalette, 'colors' | 'gradient'>
): ColorPalette | undefined => {
  return palettes.find((palette) => {
    const { colors, gradient } = palette;
    return gradient === input.gradient && isEqual(colors, input.colors);
  });
};

export const paulTor14 = createPalette({
  id: 'paul_tor_14',
  label: 'Paul Tor 14',
  colors: [
    '#882E72',
    '#B178A6',
    '#D6C1DE',
    '#1965B0',
    '#5289C7',
    '#7BAFDE',
    '#4EB265',
    '#90C987',
    '#CAE0AB',
    '#F7EE55',
    '#F6C141',
    '#F1932D',
    '#E8601C',
    '#DC050C',
  ],
  gradient: false,
});

export const paulTor21 = createPalette({
  id: 'paul_tor_21',
  label: 'Paul Tor 21',
  colors: [
    '#771155',
    '#AA4488',
    '#CC99BB',
    '#114477',
    '#4477AA',
    '#77AADD',
    '#117777',
    '#44AAAA',
    '#77CCCC',
    '#117744',
    '#44AA77',
    '#88CCAA',
    '#777711',
    '#AAAA44',
    '#DDDD77',
    '#774411',
    '#AA7744',
    '#DDAA77',
    '#771122',
    '#AA4455',
    '#DD7788',
  ],
  gradient: false,
});

export const earthTones = createPalette({
  id: 'earth_tones',
  label: strings.getEarthTones(),
  colors: [
    '#842113',
    '#984d23',
    '#32221c',
    '#739379',
    '#dab150',
    '#4d2521',
    '#716c49',
    '#bb3918',
    '#7e5436',
    '#c27c34',
    '#72392e',
    '#8f8b7e',
  ],
  gradient: false,
});

export const canvas = createPalette({
  id: 'canvas',
  label: strings.getCanvas(),
  colors: [
    '#01A4A4',
    '#CC6666',
    '#D0D102',
    '#616161',
    '#00A1CB',
    '#32742C',
    '#F18D05',
    '#113F8C',
    '#61AE24',
    '#D70060',
  ],
  gradient: false,
});

export const colorBlind = createPalette({
  id: 'color_blind',
  label: strings.getColorBlind(),
  colors: [
    '#1ea593',
    '#2b70f7',
    '#ce0060',
    '#38007e',
    '#fca5d3',
    '#f37020',
    '#e49e29',
    '#b0916f',
    '#7b000b',
    '#34130c',
  ],
  gradient: false,
});

export const elasticTeal = createPalette({
  id: 'elastic_teal',
  label: strings.getElasticTeal(),
  colors: ['#7ECAE3', '#003A4D'],
  gradient: true,
});

export const elasticBlue = createPalette({
  id: 'elastic_blue',
  label: strings.getElasticBlue(),
  colors: ['#C5FAF4', '#0F6259'],
  gradient: true,
});

export const elasticYellow = createPalette({
  id: 'elastic_yellow',
  label: strings.getElasticYellow(),
  colors: ['#FFE674', '#4D3F00'],
  gradient: true,
});

export const elasticPink = createPalette({
  id: 'elastic_pink',
  label: strings.getElasticPink(),
  colors: ['#FEA8D5', '#531E3A'],
  gradient: true,
});

export const elasticGreen = createPalette({
  id: 'elastic_green',
  label: strings.getElasticGreen(),
  colors: ['#D3FB71', '#131A00'],
  gradient: true,
});

export const elasticOrange = createPalette({
  id: 'elastic_orange',
  label: strings.getElasticOrange(),
  colors: ['#FFC68A', '#7B3F00'],
  gradient: true,
});

export const elasticPurple = createPalette({
  id: 'elastic_purple',
  label: strings.getElasticPurple(),
  colors: ['#CCC7DF', '#130351'],
  gradient: true,
});

export const greenBlueRed = createPalette({
  id: 'green_blue_red',
  label: strings.getGreenBlueRed(),
  colors: ['#D3FB71', '#7ECAE3', '#f03b20'],
  gradient: true,
});

export const yellowGreen = createPalette({
  id: 'yellow_green',
  label: strings.getYellowGreen(),
  colors: ['#f7fcb9', '#addd8e', '#31a354'],
  gradient: true,
});

export const yellowBlue = createPalette({
  id: 'yellow_blue',
  label: strings.getYellowBlue(),
  colors: ['#edf8b1', '#7fcdbb', '#2c7fb8'],
  gradient: true,
});

export const yellowRed = createPalette({
  id: 'yellow_red',
  label: strings.getYellowRed(),
  colors: ['#ffeda0', '#feb24c', '#f03b20'],
  gradient: true,
});

export const instagram = createPalette({
  id: 'instagram',
  label: strings.getInstagram(),
  colors: ['#833ab4', '#fd1d1d', '#fcb045'],
  gradient: true,
});

export const palettes = [
  paulTor14,
  paulTor21,
  earthTones,
  canvas,
  colorBlind,
  elasticTeal,
  elasticBlue,
  elasticYellow,
  elasticPink,
  elasticGreen,
  elasticOrange,
  elasticPurple,
  greenBlueRed,
  yellowGreen,
  yellowBlue,
  yellowRed,
  instagram,
];
