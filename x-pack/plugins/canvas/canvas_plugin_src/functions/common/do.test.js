/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { doFn } from './do';

describe('do', () => {
  const fn = functionWrapper(doFn);

  it('should only pass context', () => {
    expect(fn(1, { fn: '1' })).toEqual(1);
    expect(fn(true, {})).toEqual(true);
    expect(fn(null, {})).toEqual(null);
    expect(fn(null, { fn: 'not null' })).toEqual(null);
  });
});
