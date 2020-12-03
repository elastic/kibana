/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestCase } from '../../objects/case';

export const createCase = async (mycase: TestCase) => {
  cy.request({
    method: 'POST',
    url: 'api/cases',
    body: {
      description: mycase.description,
      title: mycase.name,
      tags: ['test'],
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  }).promisify();
};
