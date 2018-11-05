/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserProfile } from './user_profile';
describe('UserProfile', () => {
  it('should return true when the specified capability is enabled', () => {
    const capabilities = {
      test1: true,
      test2: false,
    };
    const userProfile = new UserProfile(capabilities);
    expect(userProfile.hasCapability('test1')).toEqual(true);
  });
  it('should return false when the specified capability is disabled', () => {
    const capabilities = {
      test1: true,
      test2: false,
    };
    const userProfile = new UserProfile(capabilities);
    expect(userProfile.hasCapability('test2')).toEqual(false);
  });
  it('should return the default value when the specified capability is not defined', () => {
    const capabilities = {
      test1: true,
      test2: false,
    };
    const userProfile = new UserProfile(capabilities);
    expect(userProfile.hasCapability('test3')).toEqual(true);
    expect(userProfile.hasCapability('test3', false)).toEqual(false);
  });
});
