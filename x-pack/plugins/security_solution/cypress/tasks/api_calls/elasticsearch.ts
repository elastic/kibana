/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rootRequest } from '../common';

export const deleteIndex = (index: string) => {
  rootRequest({
    method: 'DELETE',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const createIndex = (indexName: string, properties: Record<string, unknown>) =>
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${indexName}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    body: {
      mappings: {
        properties,
      },
    },
  });

export const indexDocument = (indexName: string, document: Record<string, unknown> = {}) =>
  cy.request({
    method: 'POST',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${indexName}/_doc`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    body: document,
  });

export const waitForRulesToFinishExecution = (ruleIds: string[]) => {
  return cy.waitUntil(
    () =>
      rootRequest<{
        hits: { hits: Array<{ _source: { alert: { params: { ruleId: string } } } }> };
      }>({
        method: 'GET',
        url: `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_alerting_cases/_search`,
        headers: { 'kbn-xsrf': 'cypress-creds' },
        failOnStatusCode: false,
        body: {
          query: {
            terms: {
              'alert.params.ruleId': ruleIds,
            },
          },
        },
      }).then((response) => {
        const areAllRulesFinished = ruleIds.every((ruleId) =>
          response.body.hits.hits.some(
            (ruleExecution) => ruleExecution._source.alert.params.ruleId === ruleId
          )
        );
        return areAllRulesFinished;
      }),
    { interval: 500, timeout: 12000 }
  );
};

export const waitForNewDocumentToBeIndexed = (index: string, initialNumberOfDocuments: number) => {
  cy.waitUntil(
    () =>
      rootRequest<{ hits: { hits: unknown[] } }>({
        method: 'GET',
        url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
        headers: { 'kbn-xsrf': 'cypress-creds' },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status !== 200) {
          return false;
        } else {
          return response.body.hits.hits.length > initialNumberOfDocuments;
        }
      }),
    { interval: 500, timeout: 12000 }
  );
};
