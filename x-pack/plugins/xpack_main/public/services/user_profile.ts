/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Capabilities {
  [capability: string]: boolean;
}

export interface UserProfile {
  hasCapability: (capability: string) => boolean;
}

export function UserProfileProvider(userProfile: Capabilities) {
  class UserProfileClass implements UserProfile {
    private capabilities: Capabilities;

    constructor(profileData: Capabilities = {}) {
      this.capabilities = {
        ...profileData,
      };
    }

    public hasCapability(capability: string, defaultValue: boolean = true): boolean {
      return capability in this.capabilities ? this.capabilities[capability] : defaultValue;
    }
  }

  return new UserProfileClass(userProfile);
}
