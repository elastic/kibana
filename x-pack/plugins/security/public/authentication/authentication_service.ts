/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StartServicesAccessor } from '../../../../../src/core/public/types';
import type { ApplicationSetup } from '../../../../../src/core/public/application/types';
import type { FatalErrorsSetup } from '../../../../../src/core/public/fatal_errors/fatal_errors_service';
import type { HttpSetup } from '../../../../../src/core/public/http/types';
import type { AuthenticatedUser } from '../../common/model/authenticated_user';
import type { ConfigType } from '../config';
import type { PluginStartDependencies } from '../plugin';
import { accessAgreementApp } from './access_agreement/access_agreement_app';
import { captureURLApp } from './capture_url/capture_url_app';
import { loggedOutApp } from './logged_out/logged_out_app';
import { loginApp } from './login/login_app';
import { logoutApp } from './logout/logout_app';
import { overwrittenSessionApp } from './overwritten_session/overwritten_session_app';

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
