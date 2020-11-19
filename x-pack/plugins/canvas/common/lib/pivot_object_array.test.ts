/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pivotObjectArray } from './pivot_object_array';

interface Car {
  make: string;
  model: string;
  price: string;
}

describe('pivotObjectArray', () => {
  let rows: Car[] = [];

  beforeEach(() => {
    rows = [
      { make: 'honda', model: 'civic', price: '10000' },
      { make: 'toyota', model: 'corolla', price: '12000' },
      { make: 'tesla', model: 'model 3', price: '35000' },
    ];
  });

  it('converts array of objects', () => {
    const data = pivotObjectArray<Car>(rows);

    expect(typeof data).toBe('object');

    expect(data).toHaveProperty('make');
    expect(data).toHaveProperty('model');
    expect(data).toHaveProperty('price');

    expect(data.make).toEqual(['honda', 'toyota', 'tesla']);
    expect(data.model).toEqual(['civic', 'corolla', 'model 3']);
    expect(data.price).toEqual(['10000', '12000', '35000']);
  });

  it('uses passed in column list', () => {
    const data = pivotObjectArray<Car, 'price'>(rows, ['price']);

    expect(typeof data).toBe('object');
    expect(data).toEqual({ price: ['10000', '12000', '35000'] });
  });

  it('adds missing columns with undefined values', () => {
    const data = pivotObjectArray<Car, 'price' | 'missing'>(rows, ['price', 'missing']);

    expect(typeof data).toBe('object');
    expect(data).toEqual({
      price: ['10000', '12000', '35000'],
      missing: [undefined, undefined, undefined],
    });
  });

  it('throws when given an invalid column list', () => {
    // @ts-expect-error testing potential calls from legacy code that should throw
    const check = () => pivotObjectArray(rows, [{ name: 'price' }, { name: 'missing' }]);
    expect(check).toThrowError('Columns should be an array of strings');
  });
});
