/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { doFn } from '../do';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('do', () => {
  const fn = functionWrapper(doFn);

  it('should only pass context', () => {
    expect(fn(1, { fn: '1' })).to.equal(1);
    expect(fn(true, {})).to.equal(true);
    expect(fn(null, {})).to.equal(null);
    expect(fn(null, { fn: 'not null' })).to.equal(null);
  });
});
