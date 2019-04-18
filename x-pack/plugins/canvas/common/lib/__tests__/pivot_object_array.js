/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pivotObjectArray } from '../pivot_object_array';

describe('pivotObjectArray', () => {
  let rows;

  beforeEach(() => {
    rows = [
      { make: 'honda', model: 'civic', price: '10000' },
      { make: 'toyota', model: 'corolla', price: '12000' },
      { make: 'tesla', model: 'model 3', price: '35000' },
    ];
  });

  it('converts array of objects', () => {
    const data = pivotObjectArray(rows);

    expect(data).to.be.an('object');
    expect(data).to.have.property('make');
    expect(data).to.have.property('model');
    expect(data).to.have.property('price');

    expect(data.make).to.eql(['honda', 'toyota', 'tesla']);
    expect(data.model).to.eql(['civic', 'corolla', 'model 3']);
    expect(data.price).to.eql(['10000', '12000', '35000']);
  });

  it('uses passed in column list', () => {
    const data = pivotObjectArray(rows, ['price']);

    expect(data).to.be.an('object');
    expect(data).to.eql({ price: ['10000', '12000', '35000'] });
  });

  it('adds missing columns with undefined values', () => {
    const data = pivotObjectArray(rows, ['price', 'missing']);

    expect(data).to.be.an('object');
    expect(data).to.eql({
      price: ['10000', '12000', '35000'],
      missing: [undefined, undefined, undefined],
    });
  });

  it('throws when given an invalid column list', () => {
    const check = () => pivotObjectArray(rows, [{ name: 'price' }, { name: 'missing' }]);
    expect(check).to.throwException('Columns should be an array of strings');
  });
});
