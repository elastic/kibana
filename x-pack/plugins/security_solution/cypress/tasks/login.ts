/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as yaml from 'js-yaml';

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

/**
 * Authenticates with Kibana using, if specified, credentials specified by
 * environment variables. The credentials in `kibana.dev.yml` will be used
 * for authentication when the environment variables are unset.
 *
 * To speed the execution of tests, prefer this non-interactive authentication,
 * which is faster than authentication via Kibana's interactive login page.
 */
export const login = () => {
  if (credentialsProvidedByEnvironment()) {
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
  cy.log(
    `Authenticating via environment credentials from the \`CYPRESS_${ELASTICSEARCH_USERNAME}\` and \`CYPRESS_${ELASTICSEARCH_PASSWORD}\` environment variables`
  );

  // programmatically authenticate without interacting with the Kibana login page
  cy.request({
    body: {
      username: Cypress.env(ELASTICSEARCH_USERNAME),
      password: Cypress.env(ELASTICSEARCH_PASSWORD),
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
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      },
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'POST',
      url: `${Cypress.config().baseUrl}${LOGIN_API_ENDPOINT}`,
    });
  });
};

/**
 * Authenticates with Kibana, visits the specified `url`, and waits for the
 * Kibana logo to be displayed before continuing
 */
export const loginAndWaitForPage = (url: string) => {
  login();
  cy.viewport('macbook-15');
  cy.visit(
    `${url}?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:'2019-01-19T16:22:56.217Z',kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:'2019-01-19T16:22:56.217Z',kind:relative,to:1579537385745,toStr:now)))`
  );
  cy.contains('a', 'Security');
};

export const loginAndWaitForPageWithoutDateRange = (url: string) => {
  login();
  cy.viewport('macbook-15');
  cy.visit(url);
  cy.contains('a', 'Security', { timeout: 120000 });
};
