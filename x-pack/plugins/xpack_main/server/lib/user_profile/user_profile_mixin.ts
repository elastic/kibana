/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserProfile } from '../../../common';
import { buildUserCapabilities } from './user_profile_capability_registry';

export function userProfileMixin(kbnServer: Record<string, any>, server: Record<string, any>) {
  const profileCache = new WeakMap();

  server.decorate('request', 'getUserProfile', async function getUserProfile() {
    // @ts-ignore
    const request: Record<string, any> = this;

    if (profileCache.has(request)) {
      return profileCache.get(request);
    }

    const userCapabilities = await buildUserCapabilities(server, request);
    const profile = new UserProfile(userCapabilities);

    profileCache.set(request, profile);

    return profile;
  });
}
