/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core/public/mocks';

import type { AuthenticatedUser } from './authenticated_user';
import {
  canUserChangeDetails,
  canUserChangePassword,
  canUserHaveProfile,
  isUserAnonymous,
} from './authenticated_user';
import { mockAuthenticatedUser } from './authenticated_user.mock';

describe('canUserChangeDetails', () => {
  const { capabilities } = applicationServiceMock.createStartContract();

  it('should indicate when user can change their details', () => {
    expect(
      canUserChangeDetails(
        mockAuthenticatedUser({
          authentication_realm: { type: 'native', name: 'native1' },
        }),
        {
          ...capabilities,
          management: {
            security: {
              users: true,
            },
          },
        }
      )
    ).toBe(true);
  });

  it('should indicate when user cannot change their details', () => {
    expect(
      canUserChangeDetails(
        mockAuthenticatedUser({
          authentication_realm: { type: 'native', name: 'native1' },
        }),
        {
          ...capabilities,
          management: {
            security: {
              users: false,
            },
          },
        }
      )
    ).toBe(false);

    expect(
      canUserChangeDetails(
        mockAuthenticatedUser({
          authentication_realm: { type: 'reserved', name: 'reserved1' },
        }),
        {
          ...capabilities,
          management: {
            security: {
              users: true,
            },
          },
        }
      )
    ).toBe(false);
  });
});

describe('isUserAnonymous', () => {
  it('should indicate anonymous user', () => {
    expect(
      isUserAnonymous(
        mockAuthenticatedUser({
          authentication_provider: { type: 'anonymous', name: 'basic1' },
        })
      )
    ).toBe(true);
  });

  it('should indicate non-anonymous user', () => {
    expect(
      isUserAnonymous(
        mockAuthenticatedUser({
          authentication_provider: { type: 'basic', name: 'basic1' },
        })
      )
    ).toBe(false);
  });
});

describe('canUserHaveProfile', () => {
  it('anonymous users cannot have profiles', () => {
    expect(
      canUserHaveProfile(
        mockAuthenticatedUser({
          authentication_provider: { type: 'anonymous', name: 'basic1' },
        })
      )
    ).toBe(false);
  });

  it('proxy authenticated users cannot have profiles', () => {
    expect(
      canUserHaveProfile(
        mockAuthenticatedUser({
          authentication_provider: { type: 'http', name: '__http__' },
        })
      )
    ).toBe(false);
  });

  it('non-anonymous users that can have sessions can have profiles', () => {
    for (const providerType of ['saml', 'oidc', 'basic', 'token', 'pki', 'kerberos']) {
      expect(
        canUserHaveProfile(
          mockAuthenticatedUser({
            authentication_provider: { type: providerType, name: `${providerType}_name` },
          })
        )
      ).toBe(true);
    }
  });
});

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
