/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleColor, Color, colorTransformer } from './color_palette';
describe('Color Palette', () => {
  describe('sampleColor()', () => {
    it('should just work', () => {
      const usedColors = [Color.color0];
      const color = sampleColor(usedColors);
      expect(color).toBe(Color.color1);
    });

    it('should return color0 when nothing is available', () => {
      const usedColors = [
        Color.color0,
        Color.color1,
        Color.color2,
        Color.color3,
        Color.color4,
        Color.color5,
        Color.color6,
        Color.color7,
        Color.color8,
        Color.color9,
      ];
      const color = sampleColor(usedColors);
      expect(color).toBe(Color.color0);
    });
  });
  describe('colorTransformer()', () => {
    it('should just work', () => {
      expect(colorTransformer(Color.color0)).toBe('#6092C0');
    });
  });
});
