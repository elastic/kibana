/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeUnitOptions } from './utils';

describe('getTimeUnitOptions', () => {
  test('return single unit time options', () => {
    const timeUnitValue = getTimeUnitOptions('1');
    expect(timeUnitValue).toMatchObject([
      { text: 'day', value: 'd' },
      { text: 'week', value: 'w' },
      { text: 'month', value: 'M' },
      { text: 'year', value: 'y' },
    ]);
  });

  test('return multiple unit time options', () => {
    const timeUnitValue = getTimeUnitOptions('10');
    expect(timeUnitValue).toMatchObject([
      { text: 'days', value: 'd' },
      { text: 'weeks', value: 'w' },
      { text: 'months', value: 'M' },
      { text: 'years', value: 'y' },
    ]);
  });

  test('return correct unit time options for 0', () => {
    const timeUnitValue = getTimeUnitOptions('0');
    expect(timeUnitValue).toMatchObject([
      { text: 'days', value: 'd' },
      { text: 'weeks', value: 'w' },
      { text: 'months', value: 'M' },
      { text: 'years', value: 'y' },
    ]);
  });

  test('return correct unit time options for negative size', () => {
    const timeUnitValue = getTimeUnitOptions('-5');
    expect(timeUnitValue).toMatchObject([
      { text: 'days', value: 'd' },
      { text: 'weeks', value: 'w' },
      { text: 'months', value: 'M' },
      { text: 'years', value: 'y' },
    ]);
  });

  test('return correct unit time options for empty string', () => {
    const timeUnitValue = getTimeUnitOptions('');
    expect(timeUnitValue).toMatchObject([
      { text: 'days', value: 'd' },
      { text: 'weeks', value: 'w' },
      { text: 'months', value: 'M' },
      { text: 'years', value: 'y' },
    ]);
  });
});
