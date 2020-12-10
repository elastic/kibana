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
          authentication_provider: { type: 'basic', name: 'basic1' },
          authentication_realm: {
            name: 'the realm name',
            type: realm,
          },
        } as AuthenticatedUser)
      ).toEqual(true);
    });

    it(`returns false for users in the ${realm} realm if used for anonymous access`, () => {
      expect(
        canUserChangePassword({
          username: 'foo',
          authentication_provider: { type: 'anonymous', name: 'does not matter' },
          authentication_realm: {
            name: 'the realm name',
            type: realm,
          },
        } as AuthenticatedUser)
      ).toEqual(false);
    });
  });

  it(`returns false for all other realms`, () => {
    expect(
      canUserChangePassword({
        username: 'foo',
        authentication_provider: { type: 'the provider type', name: 'does not matter' },
        authentication_realm: {
          name: 'the realm name',
          type: 'does not matter',
        },
      } as AuthenticatedUser)
    ).toEqual(false);
  });
});
