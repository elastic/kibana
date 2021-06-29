/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNodes } from './transforms_nodes';

describe('Transform: Nodes API endpoint', () => {
  test('isNodes()', () => {
    expect(isNodes(undefined)).toBe(false);
    expect(isNodes({})).toBe(false);
    expect(isNodes({ nodeId: {} })).toBe(false);
    expect(isNodes({ nodeId: { someAttribute: {} } })).toBe(false);
    expect(isNodes({ nodeId: { attributes: {} } })).toBe(false);
    expect(
      isNodes({
        nodeId1: { attributes: { someAttribute: true } },
        nodeId2: { someAttribute: 'asdf' },
      })
    ).toBe(false);

    // Legacy format based on attributes should return false
    expect(isNodes({ nodeId: { attributes: { someAttribute: true } } })).toBe(false);
    expect(
      isNodes({
        nodeId1: { attributes: { someAttribute: true } },
        nodeId2: { attributes: { 'transform.node': 'true' } },
      })
    ).toBe(false);

    // Current format based on roles should return true
    expect(isNodes({ nodeId: { roles: ['master', 'transform'] } })).toBe(true);
    expect(isNodes({ nodeId: { roles: ['transform'] } })).toBe(true);
    expect(
      isNodes({
        nodeId1: { roles: ['master', 'data'] },
        nodeId2: { roles: ['transform'] },
      })
    ).toBe(true);
  });
});
