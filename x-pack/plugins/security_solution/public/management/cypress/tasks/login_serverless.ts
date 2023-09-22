/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoginState } from '@kbn/security-plugin/common/login_state';
import { COMMON_API_HEADERS, request } from './common';

export enum ServerlessUser {
  T1_ANALYST = 't1_analyst',
  T2_ANALYST = 't2_analyst',
  T3_ANALYST = 't3_analyst',
  THREAT_INTELLIGENCE_ANALYST = 'threat_intelligence_analyst',
  RULE_AUTHOR = 'rule_author',
  SOC_MANAGER = 'soc_manager',
  DETECTIONS_ADMIN = 'detections_admin',
  PLATFORM_ENGINEER = 'platform_engineer',
  ENDPOINT_OPERATIONS_ANALYST = 'endpoint_operations_analyst',
  ENDPOINT_POLICY_MANAGER = 'endpoint_policy_manager',
}

/**
 * Send login via API
 * @param username
 * @param password
 *
 * @private
 */
const sendApiLoginRequest = (
  username: string,
  password: string
): Cypress.Chainable<{ username: string; password: string }> => {
  const baseUrl = Cypress.config().baseUrl;
  const headers = { ...COMMON_API_HEADERS };

  cy.log(`Authenticating [${username}] via ${baseUrl}`);

  return request<LoginState>({ headers, url: `${baseUrl}/internal/security/login_state` })
    .then((loginState) => {
      const basicProvider = loginState.body.selector.providers.find(
        (provider) => provider.type === 'basic'
      );

      return request({
        url: `${baseUrl}/internal/security/login`,
        method: 'POST',
        headers,
        body: {
          providerType: basicProvider?.type,
          providerName: basicProvider?.name,
          currentURL: '/',
          params: { username, password },
        },
      });
    })
    .then(() => ({ username, password }));
};

interface CyLoginTask {
  (user?: ServerlessUser | 'elastic'): ReturnType<typeof sendApiLoginRequest>;

  /**
   * Login using any username/password
   * @param username
   * @param password
   */
  with(username: string, password: string): ReturnType<typeof sendApiLoginRequest>;
}

/**
 * Login to Kibana using API (not login page). By default, user will be logged in using
 * the username and password defined via `KIBANA_USERNAME` and `KIBANA_PASSWORD` cypress env
 * variables.
 * @param user Defaults to `soc_manager`
 */
export const loginServerless: CyLoginTask = (
  user: ServerlessUser | 'elastic' = ServerlessUser.SOC_MANAGER
): ReturnType<typeof sendApiLoginRequest> => {
  const username = Cypress.env('KIBANA_USERNAME');
  const password = Cypress.env('KIBANA_PASSWORD');

  if (user && user !== 'elastic') {
    throw new Error('Serverless usernames not yet implemented');

    // return cy.task('loadUserAndRole', { name: user }).then((loadedUser) => {
    //   username = loadedUser.username;
    //   password = loadedUser.password;
    //
    //   return sendApiLoginRequest(username, password);
    // });
  } else {
    return sendApiLoginRequest(username, password);
  }
};

loginServerless.with = (
  username: string,
  password: string
): ReturnType<typeof sendApiLoginRequest> => {
  return sendApiLoginRequest(username, password);
};
