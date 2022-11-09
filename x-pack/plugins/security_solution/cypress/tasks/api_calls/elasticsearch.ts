/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const deleteIndex = (index: string) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const waitForNewDocumentToBeIndexed = (index: string, initialNumberOfDocuments: number) => {
  cy.waitUntil(
    () => {
      return cy
        .request({
          method: 'GET',
          url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
          headers: { 'kbn-xsrf': 'cypress-creds' },
          failOnStatusCode: false,
        })
        .then((response) => {
          if (response.status !== 200) {
            return false;
          } else {
            return response.body.hits.hits.length > initialNumberOfDocuments;
          }
        });
    },
    { interval: 500, timeout: 12000 }
  );
};
