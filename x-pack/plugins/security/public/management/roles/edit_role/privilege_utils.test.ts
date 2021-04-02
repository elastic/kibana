/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isGlobalPrivilegeDefinition } from './privilege_utils';

describe('isGlobalPrivilegeDefinition', () => {
  it('returns true if no spaces are defined', () => {
    expect(
      // @ts-ignore
      isGlobalPrivilegeDefinition({
        base: [],
        feature: {},
      })
    ).toEqual(true);
  });

  it('returns true if spaces is an empty array', () => {
    expect(
      isGlobalPrivilegeDefinition({
        spaces: [],
        base: [],
        feature: {},
      })
    ).toEqual(true);
  });

  it('returns true if spaces contains "*"', () => {
    expect(
      isGlobalPrivilegeDefinition({
        spaces: ['*'],
        base: [],
        feature: {},
      })
    ).toEqual(true);
  });

  it('returns false if spaces does not contain "*"', () => {
    expect(
      isGlobalPrivilegeDefinition({
        spaces: ['foo', 'bar'],
        base: [],
        feature: {},
      })
    ).toEqual(false);
  });
});
