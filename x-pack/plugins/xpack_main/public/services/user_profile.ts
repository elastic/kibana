/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Capabilities {
  [capability: string]: boolean;
}

interface RawUserProfileData {
  [namespace: string]: Capabilities;
}

export interface UserProfile {
  getScopedProfile: (namespace: string) => ScopedUserProfile;
}

export interface ScopedUserProfile {
  hasCapability: (capability: string) => boolean;
}

export function UserProfileProvider(userProfile: RawUserProfileData) {
  class UserProfileClass implements UserProfile {
    private capabilities: RawUserProfileData;

    constructor(profileData: RawUserProfileData = {}) {
      this.capabilities = {
        ...profileData,
      };
    }

    public getScopedProfile(namespace: string): ScopedUserProfile {
      const scopedCapabilities: Capabilities = {
        ...this.capabilities[namespace],
      };

      return {
        hasCapability: (capability: string) => scopedCapabilities[capability],
      };
    }
  }

  return new UserProfileClass(userProfile);
}
