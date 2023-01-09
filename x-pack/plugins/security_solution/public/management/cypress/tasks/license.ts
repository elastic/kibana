/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenses } from '../fixtures/licenses';

export const setupLicense = (
  body: {
    license: Record<string, unknown | { type: 'gold' | 'platinum' | 'enterprise' }>;
  } = licenses.gold
) => {
  cy.request({
    method: 'POST',
    auth: {
      user: Cypress.env('ELASTICSEARCH_USERNAME'),
      pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
    },
    headers: {
      'kbn-xsrf': 'cypress',
    },
    url: `${Cypress.env('ELASTICSEARCH_URL')}/_license/?acknowledge=true`,
    body,
  });
};
