/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { demodata } from '../demodata';

const nullFilter = {
  type: 'filter',
  meta: {},
  size: null,
  sort: [],
  and: [],
};

const fn = demodata().fn;

describe('demodata', () => {
  it('ci, different object references', () => {
    const ci1 = fn(nullFilter, { type: 'ci' });
    const ci2 = fn(nullFilter, { type: 'ci' });
    expect(ci1).not.to.equal(ci2);
    expect(ci1.rows).not.to.equal(ci2.rows);
    expect(ci1.rows[0]).not.to.equal(ci2.rows[0]);
  });
  it('shirts, different object references', () => {
    const shirts1 = fn(nullFilter, { type: 'shirts' });
    const shirts2 = fn(nullFilter, { type: 'shirts' });
    expect(shirts1).not.to.be.equal(shirts2);
    expect(shirts1.rows).not.to.be.equal(shirts2.rows);
    expect(shirts1.rows[0]).not.to.be.equal(shirts2.rows[0]);
  });
  it('invalid set', () => {
    expect(fn)
      .withArgs(null, { type: 'foo' })
      .to.throwException(e => {
        expect(e.message).to.be("Invalid data set: foo, use 'ci' or 'shirts'.");
      });
  });
});
