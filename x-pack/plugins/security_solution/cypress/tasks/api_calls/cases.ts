/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasePostRequest } from '@kbn/cases-plugin/common/api/cases';
import type { CaseConnector } from '@kbn/cases-plugin/common/api/connectors';
import type { TestCase } from '../../objects/case';

export const createCase = (newCase: TestCase) => {
  const caseBody: CasePostRequest = {
    description: newCase.description,
    title: newCase.name,
    tags: ['tag'],
    connector: {
      id: 'none',
      name: 'none',
      type: '.none',
      fields: null,
    } as CaseConnector,
    settings: {
      syncAlerts: true,
    },
    owner: newCase.owner,
    assignees: [],
  };

  return cy.request({
    method: 'POST',
    url: 'api/cases',
    body: caseBody,
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};
