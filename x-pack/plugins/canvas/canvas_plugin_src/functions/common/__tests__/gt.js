/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { gt } from '../gt';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('gt', () => {
  const fn = functionWrapper(gt);

  it('should return false when the types are different', () => {
    expect(fn(1, { value: '1' })).to.be(false);
    expect(fn('3', { value: 3 })).to.be(false);
  });

  it('should return true when greater than', () => {
    expect(fn(2, { value: 1 })).to.be(true);
    expect(fn('b', { value: 'a' })).to.be(true);
    expect(fn('foo', { value: 'bar' })).to.be(true);
  });

  it('should return false when less than or equal to', () => {
    expect(fn(1, { value: 2 })).to.be(false);
    expect(fn(2, { value: 2 })).to.be(false);
    expect(fn('a', { value: 'b' })).to.be(false);
    expect(fn('bar', { value: 'foo' })).to.be(false);
    expect(fn('foo', { value: 'foo' })).to.be(false);
  });
});
