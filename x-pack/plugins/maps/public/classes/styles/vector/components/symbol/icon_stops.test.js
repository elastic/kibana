/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getFirstUnusedSymbol } from './icon_stops';

jest.mock('./icon_select', () => ({
  IconSelect: () => {
    return <div>mockIconSelect</div>;
  },
}));

jest.mock('../../symbol_utils', () => {
  return {
    SYMBOL_OPTIONS: [{ value: 'icon1' }, { value: 'icon2' }],
    PREFERRED_ICONS: [
      'circle',
      'marker',
      'square',
      'star',
      'triangle',
      'hospital',
      'circle-stroked',
      'marker-stroked',
      'square-stroked',
      'star-stroked',
      'triangle-stroked',
    ],
  };
});

describe('getFirstUnusedSymbol', () => {
  test('Should return first unused icon from PREFERRED_ICONS', () => {
    const iconStops = [
      { stop: 'category1', icon: 'circle' },
      { stop: 'category2', icon: 'marker' },
    ];
    const nextIcon = getFirstUnusedSymbol(iconStops);
    expect(nextIcon).toBe('square');
  });

  test('Should fallback to first unused general icons when all PREFERRED_ICONS are used', () => {
    const iconStops = [
      { stop: 'category1', icon: 'circle' },
      { stop: 'category2', icon: 'marker' },
      { stop: 'category3', icon: 'square' },
      { stop: 'category4', icon: 'star' },
      { stop: 'category5', icon: 'triangle' },
      { stop: 'category6', icon: 'hospital' },
      { stop: 'category7', icon: 'circle-stroked' },
      { stop: 'category8', icon: 'marker-stroked' },
      { stop: 'category9', icon: 'square-stroked' },
      { stop: 'category10', icon: 'star-stroked' },
      { stop: 'category11', icon: 'triangle-stroked' },
      { stop: 'category12', icon: 'icon1' },
    ];
    const nextIcon = getFirstUnusedSymbol(iconStops);
    expect(nextIcon).toBe('icon2');
  });

  test('Should fallback to default icon when all icons are used', () => {
    const iconStops = [
      { stop: 'category1', icon: 'circle' },
      { stop: 'category2', icon: 'marker' },
      { stop: 'category3', icon: 'square' },
      { stop: 'category4', icon: 'star' },
      { stop: 'category5', icon: 'triangle' },
      { stop: 'category6', icon: 'hospital' },
      { stop: 'category7', icon: 'circle-stroked' },
      { stop: 'category8', icon: 'marker-stroked' },
      { stop: 'category9', icon: 'square-stroked' },
      { stop: 'category10', icon: 'star-stroked' },
      { stop: 'category11', icon: 'triangle-stroked' },
      { stop: 'category12', icon: 'icon1' },
      { stop: 'category13', icon: 'icon2' },
    ];
    const nextIcon = getFirstUnusedSymbol(iconStops);
    expect(nextIcon).toBe('marker');
  });
});
