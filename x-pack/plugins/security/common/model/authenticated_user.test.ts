/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticatedUser, canUserChangePassword } from './authenticated_user';

describe('#canUserChangePassword', () => {
  ['reserved', 'native'].forEach((realm) => {
    it(`returns true for users in the ${realm} realm`, () => {
      expect(
        canUserChangePassword({
          username: 'foo',
          authentication_realm: {
            name: 'the realm name',
            type: realm,
          },
        } as AuthenticatedUser)
      ).toEqual(true);
    });
  });

  it(`returns false for all other realms`, () => {
    expect(
      canUserChangePassword({
        username: 'foo',
        authentication_realm: {
          name: 'the realm name',
          type: 'does not matter',
        },
      } as AuthenticatedUser)
    ).toEqual(false);
  });
});
