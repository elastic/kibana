/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { distributeEqually, reversePalette } from './color_ranges_extra_actions';
import type { ColorRange } from '../types';

describe('distributeEqually', () => {
  let colorRanges: ColorRange[];
  beforeEach(() => {
    colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
      { color: '#ddd', start: 80, end: 100 },
    ];
  });

  it('should equally distribute the color ranges', () => {
    expect(distributeEqually(colorRanges, 'number', 'none', { min: 0, max: 4000 })).toEqual([
      { color: '#aaa', start: 0, end: 1000 },
      { color: '#bbb', start: 1000, end: 2000 },
      { color: '#ccc', start: 2000, end: 3000 },
      { color: '#ddd', start: 3000, end: 4000 },
    ]);
  });

  it('should work correctly with continuity to both sides', () => {
    expect(distributeEqually(colorRanges, 'percent', 'all', { min: 0, max: 5000 })).toEqual([
      { color: '#aaa', start: Number.NEGATIVE_INFINITY, end: 25 },
      { color: '#bbb', start: 25, end: 50 },
      { color: '#ccc', start: 50, end: 75 },
      { color: '#ddd', start: 75, end: Number.POSITIVE_INFINITY },
    ]);
  });
});

describe('reversePalette', () => {
  let colorRanges: ColorRange[];
  beforeEach(() => {
    colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 81 },
    ];
  });

  it('should return reversed color palette of given color range', () => {
    expect(reversePalette(colorRanges)).toEqual([
      { color: '#ccc', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#aaa', start: 60, end: 81 },
    ]);
  });
});
