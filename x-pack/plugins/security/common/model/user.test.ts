/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUserDisplayName, User } from './user';

describe('#getUserDisplayName', () => {
  it(`uses the full name when available`, () => {
    expect(
      getUserDisplayName({
        full_name: 'my full name',
        username: 'foo',
      } as User)
    ).toEqual('my full name');
  });

  it(`uses the username when full name is not available`, () => {
    expect(
      getUserDisplayName({
        username: 'foo',
      } as User)
    ).toEqual('foo');
  });
});
