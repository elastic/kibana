/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './user';
import { getUserDisplayName } from './user';

describe('#getUserDisplayName', () => {
  it(`uses the full name when available`, () => {
    expect(
      getUserDisplayName({
        full_name: 'my full name',
        email: 'foo@elastic.co',
        username: 'foo',
      } as User)
    ).toEqual('my full name');
  });

  it(`uses the email when full name is not available available`, () => {
    expect(
      getUserDisplayName({
        email: 'foo@elastic.co',
        username: 'foo',
      } as User)
    ).toEqual('foo@elastic.co');
  });

  it(`uses the username when full name and email are not available`, () => {
    expect(
      getUserDisplayName({
        username: 'foo',
      } as User)
    ).toEqual('foo');
  });
});
