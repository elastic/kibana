/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationSetup,
  FatalErrorsSetup,
  HttpSetup,
  StartServicesAccessor,
} from '@kbn/core/public';

import type { AuthenticatedUser } from '../../common/model';
import type { ConfigType } from '../config';
import type { PluginStartDependencies } from '../plugin';
import { accessAgreementApp } from './access_agreement';
import { captureURLApp } from './capture_url';
import { loggedOutApp } from './logged_out';
import { loginApp } from './login';
import { logoutApp } from './logout';
import { overwrittenSessionApp } from './overwritten_session';

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

/**
 * Start has the same contract as Setup for now.
 */
export type AuthenticationServiceStart = AuthenticationServiceSetup;

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
