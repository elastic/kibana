/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestCase } from '../../objects/case';

export const createCase = (newCase: TestCase) =>
  cy.request({
    method: 'POST',
    url: 'api/cases',
    body: {
      description: newCase.description,
      title: newCase.name,
      tags: ['tag'],
      connector: {
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      },
      settings: {
        syncAlerts: true,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
