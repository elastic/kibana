/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildUserProfile,
  registerUserProfileCapabilityFactory,
  removeAllFactories,
} from './user_profile_registry';

describe('UserProfileRegistry', () => {
  beforeEach(() => removeAllFactories());

  it('should produce an empty user profile', async () => {
    expect(await buildUserProfile(null)).toEqual({});
  });

  it('should accumulate the results of all registered factories', async () => {
    registerUserProfileCapabilityFactory(async () => ({
      foo: true,
      bar: false,
    }));

    registerUserProfileCapabilityFactory(async () => ({
      anotherCapability: true,
    }));

    expect(await buildUserProfile(null)).toEqual({
      foo: true,
      bar: false,
      anotherCapability: true,
    });
  });
});
