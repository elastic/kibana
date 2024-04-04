/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiPaletteColorBlind } from '@elastic/eui';
import { getCategoryColor } from './topn';

describe('topn', () => {
  describe('getCategoryColor', () => {
    const categories = [
      { category: 'elasticsearch', expectedColor: '#D6BF57' },
      { category: 'metricbeat', expectedColor: '#B9A888' },
      { category: 'auditbeat', expectedColor: '#E7664C' },
      { category: 'dockerd', expectedColor: '#B9A888' },
      { category: 'Other', expectedColor: '#CA8EAE' },
      { category: 'node', expectedColor: '#D36086' },
      { category: 'filebeat', expectedColor: '#54B399' },
      { category: 'containerd', expectedColor: '#DA8B45' },
      { category: 'C2 CompilerThre', expectedColor: '#6092C0' },
      { category: '[metrics]>worke', expectedColor: '#D6BF57' },
    ];
    const colors = euiPaletteColorBlind({
      rotations: Math.ceil(categories.length / 10),
    });
    categories.map(({ category, expectedColor }) => {
      it(`returns correct color for category ${category}`, () => {
        expect(getCategoryColor({ category, subChartSize: categories.length, colors })).toEqual(
          expectedColor
        );
      });
    });
  });
});
