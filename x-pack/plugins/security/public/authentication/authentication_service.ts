/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ApplicationSetup,
  StartServicesAccessor,
  HttpSetup,
  FatalErrorsSetup,
} from 'src/core/public';
import { AuthenticatedUser } from '../../common/model';
import { ConfigType } from '../config';
import { PluginStartDependencies } from '../plugin';
import { accessAgreementApp } from './access_agreement';
import { loginApp } from './login';
import { logoutApp } from './logout';
import { loggedOutApp } from './logged_out';
import { overwrittenSessionApp } from './overwritten_session';
import { captureURLApp } from './capture_url';

interface SetupParams {
  application: ApplicationSetup;
  fatalErrors: FatalErrorsSetup;
  config: ConfigType;
  http: HttpSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export interface AuthenticationServiceSetup {
  /**
   * Returns currently authenticated user and throws if current user isn't authenticated.
   */
  getCurrentUser: () => Promise<AuthenticatedUser>;

  /**
   * Determines if API Keys are currently enabled.
   */
  areAPIKeysEnabled: () => Promise<boolean>;
}

export class AuthenticationService {
  public setup({
    application,
    fatalErrors,
    config,
    getStartServices,
    http,
  }: SetupParams): AuthenticationServiceSetup {
    const getCurrentUser = async () =>
      (await http.get('/internal/security/me', { asSystemRequest: true })) as AuthenticatedUser;

    const areAPIKeysEnabled = async () =>
      ((await http.get('/internal/security/api_key/_enabled')) as { apiKeysEnabled: boolean })
        .apiKeysEnabled;

    accessAgreementApp.create({ application, getStartServices });
    captureURLApp.create({ application, fatalErrors, http });
    loginApp.create({ application, config, getStartServices, http });
    logoutApp.create({ application, http });
    loggedOutApp.create({ application, getStartServices, http });
    overwrittenSessionApp.create({ application, authc: { getCurrentUser }, getStartServices });

    return { getCurrentUser, areAPIKeysEnabled };
  }
}
