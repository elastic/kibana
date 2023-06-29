/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_AUTH = Object.freeze({
  user: Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const COMMON_API_HEADERS = { 'kbn-xsrf': 'cypress' };

export const waitForPageToBeLoaded = () => {
  cy.getByTestSubj('globalLoadingIndicator-hidden').should('exist');
  cy.getByTestSubj('globalLoadingIndicator').should('not.exist');
};

export const loadPage = (url: string, options: Partial<Cypress.VisitOptions> = {}) => {
  cy.visit(url, options);
  waitForPageToBeLoaded();
};

export const request = <T = unknown>({
  headers,
  ...options
}: Partial<Cypress.RequestOptions>): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: Object.freeze({ ...COMMON_API_HEADERS, ...headers }),
    ...options,
  });
