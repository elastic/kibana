/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { canUserChangePassword, getUserDisplayName, User } from './user';

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

describe('#canUserChangePassword', () => {
  ['reserved', 'native'].forEach(realm => {
    it(`returns true for users in the ${realm} realm`, () => {
      expect(
        canUserChangePassword({
          username: 'foo',
          authentication_realm: {
            name: 'the realm name',
            type: realm,
          },
        } as User)
      ).toEqual(true);
    });
  });

  it(`returns true when no realm is provided`, () => {
    expect(
      canUserChangePassword({
        username: 'foo',
      } as User)
    ).toEqual(true);
  });

  it(`returns false for all other realms`, () => {
    expect(
      canUserChangePassword({
        username: 'foo',
        authentication_realm: {
          name: 'the realm name',
          type: 'does not matter',
        },
      } as User)
    ).toEqual(false);
  });
});
