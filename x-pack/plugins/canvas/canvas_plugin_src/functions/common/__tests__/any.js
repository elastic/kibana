/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { any } from '../any';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('any', () => {
  const fn = functionWrapper(any);

  it('should return false with no conditions', () => {
    expect(fn(null, {})).to.be(false);
    expect(fn(null, { condition: [] })).to.be(false);
  });

  it('should return false when no conditions are true', () => {
    expect(fn(null, null, { condition: [false] })).to.be(false);
    expect(fn(null, { condition: [false, false, false] })).to.be(false);
  });

  it('should return false when all conditions are falsy', () => {
    expect(fn(null, { condition: [false, 0, '', null] })).to.be(false);
  });

  it('should return true when at least one condition is true', () => {
    expect(fn(null, { condition: [false, false, true] })).to.be(true);
    expect(fn(null, { condition: [false, true, true] })).to.be(true);
    expect(fn(null, { condition: [true, true, true] })).to.be(true);
  });

  it('should return true when at least one condition is truthy', () => {
    expect(fn(null, { condition: [false, 0, '', null, 1] })).to.be(true);
    expect(fn(null, { condition: [false, 0, 'hooray', null] })).to.be(true);
    expect(fn(null, { condition: [false, 0, {}, null] })).to.be(true);
  });
});
