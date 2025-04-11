import { euiPaletteColorBlind } from '@elastic/eui';

export const getRandomColorFromPalette = (): string => {
  const palette = euiPaletteColorBlind();
  return palette[Math.floor(Math.random() * palette.length)];
};
