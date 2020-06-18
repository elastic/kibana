/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

const RANGE_FROM = '2020-06-01T14:59:32.686Z';
const RANGE_TO = '2020-06-16T16:59:36.219Z';

const BASE_URL = Cypress.config().baseUrl;

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

export function loginAndWaitForPage(
  url: string,
  dateRange?: { to: string; from: string }
) {
  const username = Cypress.env('elasticsearch_username');
  const password = Cypress.env('elasticsearch_password');

  cy.log(`Authenticating via ${username} / ${password}`);
  let rangeFrom = RANGE_FROM;
  let rangeTo = RANGE_TO;
  if (dateRange) {
    rangeFrom = dateRange.from;
    rangeTo = dateRange.to;
  }

  const fullUrl = `${BASE_URL}${url}?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`;
  cy.visit(fullUrl, { auth: { username, password } });

  cy.viewport('macbook-15');

  // wait for loading spinner to disappear
  cy.get('#kbn_loading_message', { timeout: DEFAULT_TIMEOUT }).should(
    'not.exist'
  );
}
