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
import { isLocalhost } from '../../../../scripts/endpoint/common/is_localhost';
import { getWithResponseActionsRole } from '../../../../scripts/endpoint/common/roles_users/with_response_actions_role';
import { getNoResponseActionsRole } from '../../../../scripts/endpoint/common/roles_users/without_response_actions_role';
import { request } from './common';
import { getT1Analyst } from '../../../../scripts/endpoint/common/roles_users/t1_analyst';
import { getT2Analyst } from '../../../../scripts/endpoint/common/roles_users/t2_analyst';
import { getHunter } from '../../../../scripts/endpoint/common/roles_users/hunter';
import { getThreatIntelligenceAnalyst } from '../../../../scripts/endpoint/common/roles_users/threat_intelligence_analyst';
import { getSocManager } from '../../../../scripts/endpoint/common/roles_users/soc_manager';
import { getPlatformEngineer } from '../../../../scripts/endpoint/common/roles_users/platform_engineer';
import { getEndpointOperationsAnalyst } from '../../../../scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { getEndpointSecurityPolicyManager } from '../../../../scripts/endpoint/common/roles_users/endpoint_security_policy_manager';
import { getDetectionsEngineer } from '../../../../scripts/endpoint/common/roles_users/detections_engineer';

export enum ROLE {
  t1_analyst = 't1Analyst',
  t2_analyst = 't2Analyst',
  analyst_hunter = 'hunter',
  threat_intelligence_analyst = 'threatIntelligenceAnalyst',
  detections_engineer = 'detectionsEngineer',
  soc_manager = 'socManager',
  platform_engineer = 'platformEngineer',
  endpoint_operations_analyst = 'endpointOperationsAnalyst',
  endpoint_security_policy_manager = 'endpointSecurityPolicyManager',
  endpoint_response_actions_access = 'endpointResponseActionsAccess',
  endpoint_response_actions_no_access = 'endpointResponseActionsNoAccess',
}

export const rolesMapping: { [key in ROLE]: Omit<Role, 'name'> } = {
  t1Analyst: getT1Analyst(),
  t2Analyst: getT2Analyst(),
  hunter: getHunter(),
  threatIntelligenceAnalyst: getThreatIntelligenceAnalyst(),
  socManager: getSocManager(),
  platformEngineer: getPlatformEngineer(),
  endpointOperationsAnalyst: getEndpointOperationsAnalyst(),
  endpointSecurityPolicyManager: getEndpointSecurityPolicyManager(),
  detectionsEngineer: getDetectionsEngineer(),
  endpointResponseActionsAccess: getWithResponseActionsRole(),
  endpointResponseActionsNoAccess: getNoResponseActionsRole(),
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

const KIBANA_USERNAME = 'KIBANA_USERNAME';
const KIBANA_PASSWORD = 'KIBANA_PASSWORD';

/**
 * The Kibana server endpoint used for authentication
 */
const LOGIN_API_ENDPOINT = '/internal/security/login';

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

export const createCustomRoleAndUser = (role: string, rolePrivileges: Omit<Role, 'name'>) => {
  // post the role
  request({
    method: 'PUT',
    url: `/api/security/role/${role}`,
    body: rolePrivileges,
  });

  // post the user associated with the role to elasticsearch
  request({
    method: 'POST',
    url: `/internal/security/users/${role}`,
    body: {
      username: role,
      password: Cypress.env(ELASTICSEARCH_PASSWORD),
      roles: [role],
    },
  });
};

export const loginWithRole = async (role: ROLE) => {
  loginWithCustomRole(role, rolesMapping[role]);
};

export const loginWithCustomRole = async (role: string, rolePrivileges: Omit<Role, 'name'>) => {
  createCustomRoleAndUser(role, rolePrivileges);
  const theUrl = new URL(String(Cypress.config().baseUrl));
  theUrl.username = role;
  theUrl.password = Cypress.env(ELASTICSEARCH_PASSWORD);

  cy.log(`origin: ${theUrl}`);
  request({
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
  (Cypress.env(KIBANA_USERNAME) != null && Cypress.env(KIBANA_PASSWORD) != null) ||
  (Cypress.env(ELASTICSEARCH_USERNAME) != null && Cypress.env(ELASTICSEARCH_PASSWORD) != null);

/**
 * Authenticates with Kibana by reading credentials from the
 * `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
 * environment variables, and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaEnvironmentCredentials = () => {
  const url = Cypress.config().baseUrl;

  if (!url) {
    throw Error(`Cypress config baseUrl not set!`);
  }

  const urlObj = new URL(url);

  let username: string;
  let password: string;
  let usernameEnvVar: string;
  let passwordEnvVar: string;

  if (Cypress.env(KIBANA_USERNAME) && Cypress.env(KIBANA_PASSWORD)) {
    username = Cypress.env(KIBANA_USERNAME);
    password = Cypress.env(KIBANA_PASSWORD);
    usernameEnvVar = KIBANA_USERNAME;
    passwordEnvVar = KIBANA_PASSWORD;
  } else {
    username = Cypress.env(ELASTICSEARCH_USERNAME);
    password = Cypress.env(ELASTICSEARCH_PASSWORD);
    usernameEnvVar = ELASTICSEARCH_USERNAME;
    passwordEnvVar = ELASTICSEARCH_PASSWORD;
  }

  cy.log(
    `Authenticating user [${username}] retrieved via environment credentials from the \`CYPRESS_${usernameEnvVar}\` and \`CYPRESS_${passwordEnvVar}\` environment variables`
  );

  // programmatically authenticate without interacting with the Kibana login page
  request({
    body: {
      providerType: 'basic',
      providerName: url && !isLocalhost(urlObj.hostname) ? 'cloud-basic' : 'basic',
      currentURL: '/',
      params: {
        username,
        password,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-env' },
    method: 'POST',
    url: `${url}${LOGIN_API_ENDPOINT}`,
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
    request({
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

export const getRoleWithArtifactReadPrivilege = (privilegePrefix: string) => {
  const endpointSecurityPolicyManagerRole = getEndpointSecurityPolicyManager();

  return {
    ...endpointSecurityPolicyManagerRole,
    kibana: [
      {
        ...endpointSecurityPolicyManagerRole.kibana[0],
        feature: {
          ...endpointSecurityPolicyManagerRole.kibana[0].feature,
          siem: [
            ...endpointSecurityPolicyManagerRole.kibana[0].feature.siem.filter(
              (privilege) => privilege !== `${privilegePrefix}all`
            ),
            `${privilegePrefix}read`,
          ],
        },
      },
    ],
  };
};
