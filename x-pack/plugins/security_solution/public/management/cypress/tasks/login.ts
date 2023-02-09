/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */

import * as yaml from 'js-yaml';
import type { UrlObject } from 'url';
import Url from 'url';
import type { Role } from '@kbn/security-plugin/common';
import { getT1Analyst } from '../../../../scripts/endpoint/common/roles_users/t1_analyst';
import { getT2Analyst } from '../../../../scripts/endpoint/common/roles_users/t2_analyst';
import { getHunter } from '../../../../scripts/endpoint/common/roles_users/hunter';
import { getThreadIntelligenceAnalyst } from '../../../../scripts/endpoint/common/roles_users/thread_intelligence_analyst';
import { getSocManager } from '../../../../scripts/endpoint/common/roles_users/soc_manager';
import { getPlatformEngineer } from '../../../../scripts/endpoint/common/roles_users/platform_engineer';
import { getEndpointOperationsAnalyst } from '../../../../scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { getEndpointSecurityPolicyManager } from '../../../../scripts/endpoint/common/roles_users/endpoint_security_policy_manager';
import { getDetectionsEngineer } from '../../../../scripts/endpoint/common/roles_users/detections_engineer';

export enum ROLE {
  t1_analyst = 't1Analyst',
  t2_analyst = 't2Analyst',
  analyst_hunter = 'hunter',
  thread_intelligence_analyst = 'threadIntelligenceAnalyst',
  detections_engineer = 'detectionsEngineer',
  soc_manager = 'socManager',
  platform_engineer = 'platformEngineer',
  endpoint_operations_analyst = 'endpointOperationsAnalyst',
  endpoint_security_policy_manager = 'endpointSecurityPolicyManager',
}

export const rolesMapping: { [key in ROLE]: Omit<Role, 'name'> } = {
  t1Analyst: getT1Analyst(),
  t2Analyst: getT2Analyst(),
  hunter: getHunter(),
  threadIntelligenceAnalyst: getThreadIntelligenceAnalyst(),
  socManager: getSocManager(),
  platformEngineer: getPlatformEngineer(),
  endpointOperationsAnalyst: getEndpointOperationsAnalyst(),
  endpointSecurityPolicyManager: getEndpointSecurityPolicyManager(),
  detectionsEngineer: getDetectionsEngineer(),
};
/**
 * Credentials in the `kibana.dev.yml` config file will be used to authenticate
 * with Kibana when credentials are not provided via environment variables
 */
const KIBANA_DEV_YML_PATH = '../../../config/kibana.dev.yml';

/**
 * The configuration path in `kibana.dev.yml` to the username to be used when
 * authenticating with Kibana.
 */
const ELASTICSEARCH_USERNAME_CONFIG_PATH = 'config.elasticsearch.username';

/**
 * The configuration path in `kibana.dev.yml` to the password to be used when
 * authenticating with Kibana.
 */
const ELASTICSEARCH_PASSWORD_CONFIG_PATH = 'config.elasticsearch.password';

/**
 * The `CYPRESS_ELASTICSEARCH_USERNAME` environment variable specifies the
 * username to be used when authenticating with Kibana
 */
const ELASTICSEARCH_USERNAME = 'ELASTICSEARCH_USERNAME';

/**
 * The `CYPRESS_ELASTICSEARCH_PASSWORD` environment variable specifies the
 * username to be used when authenticating with Kibana
 */
const ELASTICSEARCH_PASSWORD = 'ELASTICSEARCH_PASSWORD';

/**
 * The Kibana server endpoint used for authentication
 */
const LOGIN_API_ENDPOINT = '/internal/security/login';

const API_AUTH = {
  user: Cypress.env(ELASTICSEARCH_USERNAME),
  pass: Cypress.env(ELASTICSEARCH_PASSWORD),
};

const API_HEADERS = { 'kbn-xsrf': 'cypress' };

/**
 * cy.visit will default to the baseUrl which uses the default kibana test user
 * This function will override that functionality in cy.visit by building the baseUrl
 * directly from the environment variables set up in x-pack/test/security_solution_cypress/runner.ts
 *
 * @param role string role/user to log in with
 * @param route string route to visit
 */
export const getUrlWithRoute = (role: string, route: string) => {
  const url = Cypress.config().baseUrl;
  const kibana = new URL(String(url));
  const theUrl = `${Url.format({
    auth: `${role}:changeme`,
    username: role,
    password: Cypress.env(ELASTICSEARCH_PASSWORD),
    protocol: kibana.protocol.replace(':', ''),
    hostname: kibana.hostname,
    port: kibana.port,
  } as UrlObject)}${route.startsWith('/') ? '' : '/'}${route}`;
  cy.log(`origin: ${theUrl}`);

  return theUrl;
};

interface User {
  username: string;
  password: string;
}

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

export const createRoleAndUser = (role: ROLE) => {
  createCustomRoleAndUser(role, rolesMapping[role]);
};

export const createCustomRoleAndUser = (role: string, rolePrivileges: Omit<Role, 'name'>) => {
  const env = getCurlScriptEnvVars();

  // post the role
  cy.request({
    method: 'PUT',
    url: `${env.KIBANA_URL}/api/security/role/${role}`,
    body: rolePrivileges,
    headers: API_HEADERS,
    auth: API_AUTH,
  });

  // post the user associated with the role to elasticsearch
  cy.request({
    method: 'POST',
    url: `${env.KIBANA_URL}/internal/security/users/${role}`,
    headers: API_HEADERS,
    body: {
      username: role,
      password: Cypress.env(ELASTICSEARCH_PASSWORD),
      roles: [role],
    },
    auth: API_AUTH,
  });
};

export const deleteRoleAndUser = (role: ROLE) => {
  const env = getCurlScriptEnvVars();

  cy.request({
    method: 'DELETE',
    auth: API_AUTH,
    headers: API_HEADERS,
    url: `${env.KIBANA_URL}/internal/security/users/${role}`,
  });
  cy.request({
    method: 'DELETE',
    auth: API_AUTH,
    headers: API_HEADERS,
    url: `${env.KIBANA_URL}/api/security/role/${role}`,
  });
};

export const loginWithUser = (user: User) => {
  const url = Cypress.config().baseUrl;

  cy.request({
    body: {
      providerType: 'basic',
      providerName: url && !url.includes('localhost') ? 'cloud-basic' : 'basic',
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

export const loginWithRole = async (role: ROLE) => {
  loginWithCustomRole(role, rolesMapping[role]);
};

export const loginWithCustomRole = async (role: string, rolePrivileges: Omit<Role, 'name'>) => {
  createCustomRoleAndUser(role, rolePrivileges);
  const theUrl = Url.format({
    auth: `${role}:changeme`,
    username: role,
    password: Cypress.env(ELASTICSEARCH_PASSWORD),
    protocol: Cypress.env('protocol'),
    hostname: Cypress.env('hostname'),
    port: Cypress.env('configport'),
  } as UrlObject);
  cy.log(`origin: ${theUrl}`);
  cy.request({
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: {
        username: role,
        password: Cypress.env(ELASTICSEARCH_PASSWORD),
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    method: 'POST',
    url: getUrlWithRoute(role, LOGIN_API_ENDPOINT),
  });
};

/**
 * Authenticates with Kibana using, if specified, credentials specified by
 * environment variables. The credentials in `kibana.dev.yml` will be used
 * for authentication when the environment variables are unset.
 *
 * To speed the execution of tests, prefer this non-interactive authentication,
 * which is faster than authentication via Kibana's interactive login page.
 */
export const login = (role?: ROLE) => {
  if (role != null) {
    loginWithRole(role);
  } else if (credentialsProvidedByEnvironment()) {
    loginViaEnvironmentCredentials();
  } else {
    loginViaConfig();
  }
};

/**
 * Returns `true` if the credentials used to login to Kibana are provided
 * via environment variables
 */
const credentialsProvidedByEnvironment = (): boolean =>
  Cypress.env(ELASTICSEARCH_USERNAME) != null && Cypress.env(ELASTICSEARCH_PASSWORD) != null;

/**
 * Authenticates with Kibana by reading credentials from the
 * `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
 * environment variables, and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaEnvironmentCredentials = () => {
  const url = Cypress.config().baseUrl;

  cy.log(
    `Authenticating via environment credentials from the \`CYPRESS_${ELASTICSEARCH_USERNAME}\` and \`CYPRESS_${ELASTICSEARCH_PASSWORD}\` environment variables`
  );

  // programmatically authenticate without interacting with the Kibana login page
  cy.request({
    body: {
      providerType: 'basic',
      providerName: url && !url.includes('localhost') ? 'cloud-basic' : 'basic',
      currentURL: '/',
      params: {
        username: Cypress.env(ELASTICSEARCH_USERNAME),
        password: Cypress.env(ELASTICSEARCH_PASSWORD),
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-env' },
    method: 'POST',
    url: `${Cypress.config().baseUrl}${LOGIN_API_ENDPOINT}`,
  });
};

/**
 * Authenticates with Kibana by reading credentials from the
 * `kibana.dev.yml` file and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaConfig = () => {
  cy.log(
    `Authenticating via config credentials \`${ELASTICSEARCH_USERNAME_CONFIG_PATH}\` and \`${ELASTICSEARCH_PASSWORD_CONFIG_PATH}\` from \`${KIBANA_DEV_YML_PATH}\``
  );

  // read the login details from `kibana.dev.yaml`
  cy.readFile(KIBANA_DEV_YML_PATH).then((kibanaDevYml) => {
    const config = yaml.safeLoad(kibanaDevYml);

    // programmatically authenticate without interacting with the Kibana login page
    cy.request({
      body: {
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: {
          username: Cypress.env(ELASTICSEARCH_USERNAME),
          password: config.elasticsearch.password,
        },
      },
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'POST',
      url: `${Cypress.config().baseUrl}${LOGIN_API_ENDPOINT}`,
    });
  });
};

/**
 * Get the configured auth details that were used to spawn cypress
 *
 * @returns the default Elasticsearch username and password for this environment
 */
export const getEnvAuth = (): User => {
  if (credentialsProvidedByEnvironment()) {
    return {
      username: Cypress.env(ELASTICSEARCH_USERNAME),
      password: Cypress.env(ELASTICSEARCH_PASSWORD),
    };
  } else {
    let user: User = { username: '', password: '' };
    cy.readFile(KIBANA_DEV_YML_PATH).then((devYml) => {
      const config = yaml.safeLoad(devYml);
      user = { username: config.elasticsearch.username, password: config.elasticsearch.password };
    });

    return user;
  }
};

/**
 * Authenticates with Kibana, visits the specified `url`, and waits for the
 * Kibana global nav to be displayed before continuing
 */
export const loginAndWaitForPage = (url: string) => {
  login();
  cy.visit(url);
};
