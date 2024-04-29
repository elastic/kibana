/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoginState } from '@kbn/security-plugin/common/login_state';
import type { Role } from '@kbn/security-plugin/common';
import { ENDPOINT_SECURITY_ROLE_NAMES } from '../../../../scripts/endpoint/common/roles_users';
import type { SecurityTestUser } from '../common/constants';
import { COMMON_API_HEADERS, request } from './common';

export const ROLE = Object.freeze<Record<SecurityTestUser, SecurityTestUser>>({
  ...ENDPOINT_SECURITY_ROLE_NAMES,
  elastic: 'elastic',
  elastic_serverless: 'elastic_serverless',
  system_indices_superuser: 'system_indices_superuser',
});

interface CyLoginTask {
  (user?: SecurityTestUser): ReturnType<typeof sendApiLoginRequest>;

  /**
   * Login using any username/password
   * @param username
   * @param password
   */
  with(username: string, password: string): ReturnType<typeof sendApiLoginRequest>;

  /**
   * Creates the provided role in kibana/ES along with a respective user (same name as role)
   * and then login with this new user
   * @param role
   */
  withCustomRole(role: Role): ReturnType<typeof sendApiLoginRequest>;
}

/**
 * Login to Kibana using API (not login page).
 * By default, user will be logged in using `KIBANA_USERNAME` and `KIBANA_PASSWORD` retrieved from
 * the cypress `env`
 *
 * @param user
 */
export const login: CyLoginTask = (
  user: SecurityTestUser = ROLE.endpoint_operations_analyst
): ReturnType<typeof sendApiLoginRequest> => {
  let username = Cypress.env('KIBANA_USERNAME');
  let password = Cypress.env('KIBANA_PASSWORD');
  const isServerless = Cypress.env('IS_SERVERLESS');
  const isCloudServerless = Cypress.env('CLOUD_SERVERLESS');

  if (isServerless && isCloudServerless) {
    // MKI QA Cloud Serverless
    return cy
      .task('getSessionCookie', user)
      .then((result) => {
        username = result.username;
        password = result.password;
        // Set cookie asynchronously
        return cy.setCookie('sid', result.cookie as string);
      })
      .then(() => {
        // Visit URL after setting cookie
        return cy.visit('/');
      })
      .then(() => {
        // Return username and password
        return { username, password };
      });
  } else if (user) {
    return cy.task('loadUserAndRole', { name: user }).then((loadedUser) => {
      username = loadedUser.username;
      password = loadedUser.password;

      return sendApiLoginRequest(username, password);
    });
  } else {
    return sendApiLoginRequest(username, password);
  }
};

login.with = (username: string, password: string): ReturnType<typeof sendApiLoginRequest> => {
  return sendApiLoginRequest(username, password);
};

login.withCustomRole = (role: Role): ReturnType<typeof sendApiLoginRequest> => {
  return cy.task('createUserAndRole', { role }).then(({ username, password }) => {
    return sendApiLoginRequest(username, password);
  });
};

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
  const loginUrl = `${baseUrl}/internal/security/login`;
  const headers = { ...COMMON_API_HEADERS };

  cy.log(`Authenticating [${username}] via ${loginUrl}`);

  return request<LoginState>({ headers, url: `${baseUrl}/internal/security/login_state` })
    .then((loginState) => {
      const basicProvider = loginState.body.selector.providers.find(
        (provider) => provider.type === 'basic'
      );
      return request({
        url: loginUrl,
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
