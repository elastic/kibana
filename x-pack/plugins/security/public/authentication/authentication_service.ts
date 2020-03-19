/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationSetup, CoreSetup, HttpSetup } from 'src/core/public';
import { AuthenticatedUser } from '../../common/model';
import { ConfigType } from '../config';
import { PluginStartDependencies } from '../plugin';
import { loginApp } from './login';
import { logoutApp } from './logout';
import { loggedOutApp } from './logged_out';
import { overwrittenSessionApp } from './overwritten_session';

interface SetupParams {
  application: ApplicationSetup;
  config: ConfigType;
  http: HttpSetup;
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
}

export interface AuthenticationServiceSetup {
  /**
   * Returns currently authenticated user and throws if current user isn't authenticated.
   */
  getCurrentUser: () => Promise<AuthenticatedUser>;
}

export class AuthenticationService {
  public setup({
    application,
    config,
    getStartServices,
    http,
  }: SetupParams): AuthenticationServiceSetup {
    const getCurrentUser = async () =>
      (await http.get('/internal/security/me', { asSystemRequest: true })) as AuthenticatedUser;

    loginApp.create({ application, config, getStartServices, http });
    logoutApp.create({ application, http });
    loggedOutApp.create({ application, getStartServices, http });
    overwrittenSessionApp.create({ application, authc: { getCurrentUser }, getStartServices });

    return { getCurrentUser };
  }
}
