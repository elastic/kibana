/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNER_INFO } from '../constants';
import { isValidOwner } from './owner';

describe('isValidOwner', () => {
  const owners = Object.keys(OWNER_INFO) as Array<keyof typeof OWNER_INFO>;

  it.each(owners)('returns true for valid owner: %s', (owner) => {
    expect(isValidOwner(owner)).toBe(true);
  });

  it('return false for invalid owner', () => {
    expect(isValidOwner('not-valid')).toBe(false);
  });
});
