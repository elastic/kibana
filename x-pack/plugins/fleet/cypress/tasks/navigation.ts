/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TOGGLE_NAVIGATION_BTN,
  LOGIN_USERNAME_INPUT,
  LOGIN_PASSWORD_INPUT,
  LOGIN_BTN,
} from '../screens/navigation';

export const INTEGRATIONS = 'app/integrations#/';
export const FLEET = 'app/fleet/';
export const SECURITY_ROLES = 'app/management/security/roles';
export const SECURITY_USERS = 'app/management/security/users';
export const LOGIN_API_ENDPOINT = '/internal/security/login';
export const LOGIN_URL = '/login';
export const LOGOUT_URL = '/api/security/logout';

export const navigateTo = (page: string) => {
  cy.visit(page);
};

export const openNavigationFlyout = () => {
  cy.get(TOGGLE_NAVIGATION_BTN).click();
};

export const logout = () => {
  cy.visit(LOGOUT_URL);
};

export const loginViaUi = (user: User) => {
  cy.visit(LOGIN_URL);
  cy.getBySel(LOGIN_USERNAME_INPUT).type(user.username);
  cy.getBySel(LOGIN_PASSWORD_INPUT).type(user.password);
  cy.getBySel(LOGIN_BTN).click();
};

export interface User {
  username: string;
  password: string;
}

export const loginWithUser = (user: User) => {
  cy.request({
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: {
        username: user.username,
        password: user.password,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    method: 'POST',
    url: constructUrlWithUser(user, LOGIN_API_ENDPOINT),
  });
};

export const loginWithUserAndWaitForPage = (url: string, user: User) => {
  loginWithUser(user);
  cy.visit(constructUrlWithUser(user, url));
  cy.get('[data-test-subj="headerGlobalNav"]', { timeout: 120000 });
};

export const KIBANA_URL = Cypress.config().baseUrl;
export const loginAs = ({ username, password }: { username: string; password: string }) => {
  cy.log(`Logging in as ${username}`);
  const kibanaUrl = Cypress.env('KIBANA_URL');
  cy.log(kibanaUrl);
  cy.request({
    log: false,
    method: 'POST',
    url: `${kibanaUrl}/internal/security/login`,
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: `${kibanaUrl}/login`,
      params: { username, password },
    },
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
  });
  // After login, wait for Kibana global nav
  // cy.get('[data-test-subj="headerGlobalNav"]', { timeout: 120000 });
};

/**
 * Builds a URL with basic auth using the passed in user.
 *
 * @param user the user information to build the basic auth with
 * @param route string route to visit
 */
export const constructUrlWithUser = (user: User, route: string) => {
  const url = Cypress.config().baseUrl;
  const kibana = new URL(String(url));
  const hostname = kibana.hostname;
  const username = user.username;
  const password = user.password;
  const protocol = kibana.protocol.replace(':', '');
  const port = kibana.port;

  const path = `${route.startsWith('/') ? '' : '/'}${route}`;
  const strUrl = `${protocol}://${username}:${password}@${hostname}:${port}${path}`;
  const builtUrl = new URL(strUrl);

  cy.log(`origin: ${builtUrl.href}`);
  return builtUrl.href;
};

export const getCurlScriptEnvVars = () => ({
  ELASTICSEARCH_URL: Cypress.env('ELASTICSEARCH_URL'),
  ELASTICSEARCH_USERNAME: Cypress.env('ELASTICSEARCH_USERNAME'),
  ELASTICSEARCH_PASSWORD: Cypress.env('ELASTICSEARCH_PASSWORD'),
  KIBANA_URL: Cypress.config().baseUrl,
});

export const deleteRoleAndUser = (role: string) => {
  const env = getCurlScriptEnvVars();
  const detectionsUserDeleteScriptPath = `./server/lib/detection_engine/scripts/roles_users/${role}/delete_detections_user.sh`;

  // delete the role
  cy.exec(`bash ${detectionsUserDeleteScriptPath}`, {
    env,
  });
};
