/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeKibanaBrowserSecurityToastIfNecessary } from './toasts';

export const API_AUTH = Object.freeze({
  user: Cypress.env('KIBANA_USERNAME') ?? Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('KIBANA_PASSWORD') ?? Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const COMMON_API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress',
  'x-elastic-internal-origin': 'security-solution',
  'Elastic-Api-Version': '2023-10-31',
});

export const waitForPageToBeLoaded = () => {
  cy.getByTestSubj('globalLoadingIndicator-hidden').should('exist');
  cy.getByTestSubj('globalLoadingIndicator').should('not.exist');
};

export const loadPage = (url: string, options: Partial<Cypress.VisitOptions> = {}) => {
  cy.visit(url, options);
  waitForPageToBeLoaded();
  closeKibanaBrowserSecurityToastIfNecessary();
};

export const request = <T = unknown>({
  headers,
  ...options
}: Partial<Cypress.RequestOptions>): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: { ...COMMON_API_HEADERS, ...headers },
    ...options,
  });

const API_HEADERS = Object.freeze({ 'kbn-xsrf': 'cypress' });
export const rootRequest = <T = unknown>(
  options: Partial<Cypress.RequestOptions>
): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: API_HEADERS,
    ...options,
  });
