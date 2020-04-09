/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { serialize } from '../resolvers';

describe('serialize', () => {
  it('serializes date strings correctly', () => {
    const result = serialize('2019-07-08T16:59:09.796Z');
    expect(result).toBe(1562605149796);
  });

  it('serializes timestamp strings correctly', () => {
    const result = serialize('1562605032000');
    expect(result).toBe(1562605032000);
  });

  it('serializes non-date and non-numeric values to NaN', () => {
    const result = serialize('foo');
    expect(result).toBeNaN();
  });
});
