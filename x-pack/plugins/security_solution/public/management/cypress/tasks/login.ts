/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoginState } from '@kbn/security-plugin/common/login_state';
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
}

/**
 * Login to Kibana using API (not login page).
 * By default, user will be logged in using `KIBANA_USERNAME` and `KIBANA_PASSWORD` retrieved from
 * the cypress `env`
 *
 * @param user
 */
export const login: CyLoginTask = (
  // FIXME:PT default user to `soc_manager`
  user?: SecurityTestUser
): ReturnType<typeof sendApiLoginRequest> => {
  let username = Cypress.env('KIBANA_USERNAME');
  let password = Cypress.env('KIBANA_PASSWORD');

  if (user) {
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

//
// export const rolesMapping: { [key in ROLE]: Omit<Role, 'name'> } = {
//   t1Analyst: getT1Analyst(),
//   t2Analyst: getT2Analyst(),
//   hunter: getHunter(),
//   threatIntelligenceAnalyst: getThreatIntelligenceAnalyst(),
//   socManager: getSocManager(),
//   platformEngineer: getPlatformEngineer(),
//   endpointOperationsAnalyst: getEndpointOperationsAnalyst(),
//   endpointSecurityPolicyManager: getEndpointSecurityPolicyManager(),
//   detectionsEngineer: getDetectionsEngineer(),
//   endpointResponseActionsAccess: getWithResponseActionsRole(),
//   endpointResponseActionsNoAccess: getNoResponseActionsRole(),
//   endpointSecurityPolicyManagementRead: getEndpointSecurityPolicyManagementReadRole(),
// };
// /**
//  * Credentials in the `kibana.dev.yml` config file will be used to authenticate
//  * with Kibana when credentials are not provided via environment variables
//  */
// const KIBANA_DEV_YML_PATH = '../../../config/kibana.dev.yml';
//
// /**
//  * The configuration path in `kibana.dev.yml` to the username to be used when
//  * authenticating with Kibana.
//  */
// const ELASTICSEARCH_USERNAME_CONFIG_PATH = 'config.elasticsearch.username';
//
// /**
//  * The configuration path in `kibana.dev.yml` to the password to be used when
//  * authenticating with Kibana.
//  */
// const ELASTICSEARCH_PASSWORD_CONFIG_PATH = 'config.elasticsearch.password';
//
// /**
//  * The `CYPRESS_ELASTICSEARCH_USERNAME` environment variable specifies the
//  * username to be used when authenticating with Kibana
//  */
// const ELASTICSEARCH_USERNAME = 'ELASTICSEARCH_USERNAME';
//
// /**
//  * The `CYPRESS_ELASTICSEARCH_PASSWORD` environment variable specifies the
//  * username to be used when authenticating with Kibana
//  */
// const ELASTICSEARCH_PASSWORD = 'ELASTICSEARCH_PASSWORD';
//
// const KIBANA_USERNAME = 'KIBANA_USERNAME';
// const KIBANA_PASSWORD = 'KIBANA_PASSWORD';
//
// export const createCustomRoleAndUser = (role: string, rolePrivileges: Omit<Role, 'name'>) => {
//   // post the role
//   request({
//     method: 'PUT',
//     url: `/api/security/role/${role}`,
//     body: rolePrivileges,
//   });
//
//   // post the user associated with the role to elasticsearch
//   request({
//     method: 'POST',
//     url: `/internal/security/users/${role}`,
//     body: {
//       username: role,
//       password: Cypress.env(ELASTICSEARCH_PASSWORD),
//       roles: [role],
//     },
//   });
// };
//
// const loginWithUsernameAndPassword = (username: string, password: string) => {
//   const baseUrl = Cypress.config().baseUrl;
//   if (!baseUrl) {
//     throw Error(`Cypress config baseUrl not set!`);
//   }
//
//   // Programmatically authenticate without interacting with the Kibana login page.
//   const headers = { 'kbn-xsrf': 'cypress-creds' };
//   request<LoginState>({ headers, url: `${baseUrl}/internal/security/login_state` }).then(
//     (loginState) => {
//       const basicProvider = loginState.body.selector.providers.find(
//         (provider) => provider.type === 'basic'
//       );
//       return request({
//         url: `${baseUrl}/internal/security/login`,
//         method: 'POST',
//         headers,
//         body: {
//           providerType: basicProvider.type,
//           providerName: basicProvider.name,
//           currentURL: '/',
//           params: { username, password },
//         },
//       });
//     }
//   );
// };
//
// export const loginWithRole = (role: ROLE) => {
//   loginWithCustomRole(role, rolesMapping[role]);
// };
//
// export const loginWithCustomRole = (role: string, rolePrivileges: Omit<Role, 'name'>) => {
//   createCustomRoleAndUser(role, rolePrivileges);
//
//   cy.log(`origin: ${Cypress.config().baseUrl}`);
//
//   loginWithUsernameAndPassword(role, Cypress.env(ELASTICSEARCH_PASSWORD));
// };
//
// /**
//  * Authenticates with Kibana using, if specified, credentials specified by
//  * environment variables. The credentials in `kibana.dev.yml` will be used
//  * for authentication when the environment variables are unset.
//  *
//  * To speed the execution of tests, prefer this non-interactive authentication,
//  * which is faster than authentication via Kibana's interactive login page.
//  */
// export const login = (role?: ROLE) => {
//   if (role != null) {
//     loginWithRole(role);
//   } else if (credentialsProvidedByEnvironment()) {
//     loginViaEnvironmentCredentials();
//   } else {
//     loginViaConfig();
//   }
// };
//
// /**
//  * Returns `true` if the credentials used to login to Kibana are provided
//  * via environment variables
//  */
// const credentialsProvidedByEnvironment = (): boolean =>
//   (Cypress.env(KIBANA_USERNAME) != null && Cypress.env(KIBANA_PASSWORD) != null) ||
//   (Cypress.env(ELASTICSEARCH_USERNAME) != null && Cypress.env(ELASTICSEARCH_PASSWORD) != null);
//
// /**
//  * Authenticates with Kibana by reading credentials from the
//  * `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
//  * environment variables, and POSTing the username and password directly to
//  * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
//  */
// const loginViaEnvironmentCredentials = () => {
//   let username: string;
//   let password: string;
//   let usernameEnvVar: string;
//   let passwordEnvVar: string;
//
//   if (Cypress.env(KIBANA_USERNAME) && Cypress.env(KIBANA_PASSWORD)) {
//     username = Cypress.env(KIBANA_USERNAME);
//     password = Cypress.env(KIBANA_PASSWORD);
//     usernameEnvVar = KIBANA_USERNAME;
//     passwordEnvVar = KIBANA_PASSWORD;
//   } else {
//     username = Cypress.env(ELASTICSEARCH_USERNAME);
//     password = Cypress.env(ELASTICSEARCH_PASSWORD);
//     usernameEnvVar = ELASTICSEARCH_USERNAME;
//     passwordEnvVar = ELASTICSEARCH_PASSWORD;
//   }
//
//   cy.log(
//     `Authenticating user [${username}] retrieved via environment credentials from the \`CYPRESS_${usernameEnvVar}\` and \`CYPRESS_${passwordEnvVar}\` environment variables`
//   );
//
//   loginWithUsernameAndPassword(username, password);
// };
//
// /**
//  * Authenticates with Kibana by reading credentials from the
//  * `kibana.dev.yml` file and POSTing the username and password directly to
//  * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
//  */
// const loginViaConfig = () => {
//   cy.log(
//     `Authenticating via config credentials \`${ELASTICSEARCH_USERNAME_CONFIG_PATH}\` and \`${ELASTICSEARCH_PASSWORD_CONFIG_PATH}\` from \`${KIBANA_DEV_YML_PATH}\``
//   );
//
//   // read the login details from `kibana.dev.yaml`
//   cy.readFile(KIBANA_DEV_YML_PATH).then((kibanaDevYml) => {
//     const config = yaml.safeLoad(kibanaDevYml);
//     loginWithUsernameAndPassword(
//       Cypress.env(ELASTICSEARCH_USERNAME),
//       config.elasticsearch.password
//     );
//   });
// };
//
// export const getRoleWithArtifactReadPrivilege = (privilegePrefix: string) => {
//   const endpointSecurityPolicyManagerRole = getEndpointSecurityPolicyManager();
//
//   return {
//     ...endpointSecurityPolicyManagerRole,
//     kibana: [
//       {
//         ...endpointSecurityPolicyManagerRole.kibana[0],
//         feature: {
//           ...endpointSecurityPolicyManagerRole.kibana[0].feature,
//           siem: [
//             ...endpointSecurityPolicyManagerRole.kibana[0].feature.siem.filter(
//               (privilege) => privilege !== `${privilegePrefix}all`
//             ),
//             `${privilegePrefix}read`,
//           ],
//         },
//       },
//     ],
//   };
// };
