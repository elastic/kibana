/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserProfileServiceStart } from '@kbn/security-plugin-types-server';

export class UserPreferencesService {
  constructor(private userProfileService: UserProfileServiceStart) {
    this.userProfileService = userProfileService;
  }

  public async get(request: KibanaRequest) {
    return this.userProfileService.getCurrent({
      request,
      dataPath: 'userPreferences',
    });
  }

  public async update<D>(request: KibanaRequest, data: D) {
    return this.userProfileService.update(request.uuid, {
      userPreferences: {
        securitySolution: data,
      },
    });
  }
}
