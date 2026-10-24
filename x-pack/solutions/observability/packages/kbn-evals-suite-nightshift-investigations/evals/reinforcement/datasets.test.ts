/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REINFORCEMENT_EXAMPLE_LIMIT, selectCustomer0Examples } from './datasets';

describe('selectCustomer0Examples', () => {
  const examples = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('keeps the first few examples in stored order', () => {
    expect(selectCustomer0Examples(examples, 2)).toEqual(['a', 'b']);
  });

  it('caps the run at five examples', () => {
    expect(selectCustomer0Examples(examples, 9)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('falls back to the default count when the limit is not a number', () => {
    expect(selectCustomer0Examples(examples, Number.NaN)).toHaveLength(REINFORCEMENT_EXAMPLE_LIMIT);
  });
});
