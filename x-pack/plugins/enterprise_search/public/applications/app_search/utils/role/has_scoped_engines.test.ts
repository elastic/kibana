/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { roleHasScopedEngines } from '.';

describe('roleHasScopedEngines', () => {
  it('returns false for owner and admin roles', () => {
    expect(roleHasScopedEngines('owner')).toEqual(false);
    expect(roleHasScopedEngines('admin')).toEqual(false);
  });

  it('returns true for dev, editor, and analyst roles', () => {
    expect(roleHasScopedEngines('dev')).toEqual(true);
    expect(roleHasScopedEngines('editor')).toEqual(true);
    expect(roleHasScopedEngines('analyst')).toEqual(true);
  });
});
