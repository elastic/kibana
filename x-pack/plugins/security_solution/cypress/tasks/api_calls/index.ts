/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createIndex = (index: string) => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const createEmptyDocument = (index: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_doc`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    body: {},
  });
};

export const deleteIndex = (index: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};
