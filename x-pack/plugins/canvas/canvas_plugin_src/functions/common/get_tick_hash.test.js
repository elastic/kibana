/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTickHash } from './plot/get_tick_hash';

describe('getTickHash', () => {
  it('creates a hash for tick marks for string columns only', () => {
    const columns = {
      x: { type: 'string', role: 'dimension', expression: 'project' },
      y: { type: 'string', role: 'dimension', expression: 'location' },
    };
    const rows = [
      { x: 'product1', y: 'AZ' },
      { x: 'product2', y: 'AZ' },
      { x: 'product1', y: 'CA' },
      { x: 'product2', y: 'CA' },
    ];

    expect(getTickHash(columns, rows)).toEqual({
      x: { hash: { product1: 2, product2: 1 }, counter: 3 },
      y: { hash: { CA: 1, AZ: 2 }, counter: 3 },
    });
  });

  it('ignores columns of any other type', () => {
    const columns = {
      x: { type: 'number', role: 'dimension', expression: 'id' },
      y: { type: 'boolean', role: 'dimension', expression: 'running' },
    };
    const rows = [
      { x: 1, y: true },
      { x: 2, y: true },
      { x: 1, y: false },
      { x: 2, y: false },
    ];

    expect(getTickHash(columns, rows)).toEqual({
      x: { hash: {}, counter: 0 },
      y: { hash: {}, counter: 0 },
    });
  });
});
