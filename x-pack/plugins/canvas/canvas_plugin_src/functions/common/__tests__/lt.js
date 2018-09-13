/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { lt } from '../lt';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('lt', () => {
  const fn = functionWrapper(lt);

  it('should return false when the types are different', () => {
    expect(fn(1, { value: '1' })).to.be(false);
    expect(fn(true, { value: 'true' })).to.be(false);
    expect(fn(null, { value: 'null' })).to.be(false);
  });

  it('should return false when greater than or equal to', () => {
    expect(fn(2, { value: 1 })).to.be(false);
    expect(fn(2, { value: 2 })).to.be(false);
    expect(fn('foo', { value: 'bar' })).to.be(false);
    expect(fn('foo', { value: 'foo' })).to.be(false);
    expect(fn(true, { value: false })).to.be(false);
    expect(fn(true, { value: true })).to.be(false);
  });

  it('should return true when less than', () => {
    expect(fn(1, { value: 2 })).to.be(true);
    expect(fn('bar', { value: 'foo' })).to.be(true);
    expect(fn(false, { value: true })).to.be(true);
  });
});
