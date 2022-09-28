/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createConnector = (connector: Record<string, any>) =>
  cy.request({
    method: 'POST',
    url: '/api/actions/action',
    body: connector,
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
