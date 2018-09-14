import chroma from 'chroma-js';

export const getColorsFromPalette = (palette, size) =>
  palette.gradient ? chroma.scale(palette.colors).colors(size) : palette.colors;
