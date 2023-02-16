/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../common/constants';
import type { RuleCreateProps } from '../../../common/detection_engine/rule_schema';

export const createRule = (rule: RuleCreateProps) => {
  return cy.request({
    method: 'POST',
    url: DETECTION_ENGINE_RULES_URL,
    body: rule,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const deleteCustomRule = (ruleId = '1') => {
  cy.request({
    method: 'DELETE',
    url: `api/detection_engine/rules?rule_id=${ruleId}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const importRule = (ndjsonPath: string) => {
  cy.fixture(ndjsonPath)
    .then((file) => Cypress.Blob.binaryStringToBlob(file))
    .then((blob) => {
      const formdata = new FormData();
      formdata.append('file', blob, ndjsonPath);

      cy.request({
        url: 'api/detection_engine/rules/_import',
        method: 'POST',
        headers: {
          'kbn-xsrf': 'cypress-creds',
          'content-type': 'multipart/form-data',
        },
        body: formdata,
      })
        .its('status')
        .should('be.equal', 200);
    });
};
