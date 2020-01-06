/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import { AuthenticatedUser } from '../../common/model';

interface SetupParams {
  http: HttpSetup;
}

export interface AuthenticationServiceSetup {
  /**
   * Returns currently authenticated user and throws if current user isn't authenticated.
   */
  getCurrentUser: () => Promise<AuthenticatedUser>;
}

export class AuthenticationService {
  public setup({ http }: SetupParams): AuthenticationServiceSetup {
    return {
      async getCurrentUser() {
        return (await http.get('/internal/security/me', {
          headers: { 'kbn-system-api': true },
        })) as AuthenticatedUser;
      },
    };
  }
}
