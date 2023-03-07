/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENDPOINT_VM_NAME = 'ENDPOINT_VM_NAME';

export const API_AUTH = {
  user: Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
};

export const API_HEADERS = { 'kbn-xsrf': 'cypress' };

export const request = <T = unknown>(
  options: Partial<Cypress.RequestOptions>
): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: API_HEADERS,
    ...options,
  });
