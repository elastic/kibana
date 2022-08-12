/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const kibanaSettings = (body: Cypress.RequestBody) => {
  cy.request({
    method: 'POST',
    url: 'api/kibana/settings',
    body,
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};

const relatedIntegrationsBody = (status: boolean): Cypress.RequestBody => {
  return { changes: { 'securitySolution:showRelatedIntegrations': status } };
};

export const enableRelatedIntegrations = () => {
  kibanaSettings(relatedIntegrationsBody(true));
};

export const disableRelatedIntegrations = () => {
  kibanaSettings(relatedIntegrationsBody(false));
};
