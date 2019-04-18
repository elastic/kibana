/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { clear } from '../clear';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from './fixtures/test_tables';

describe('clear', () => {
  const fn = functionWrapper(clear);

  it('returns null for any context', () => {
    expect(fn()).to.be(null);
    expect(fn('foo')).to.be(null);
    expect(fn(2)).to.be(null);
    expect(fn(testTable)).to.be(null);
  });
});
