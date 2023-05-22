/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from '../common';
import moment from 'moment';
import { Rule } from '@kbn/alerting-plugin/common';
import { DETECTION_ENGINE_RULES_URL } from '../../../common/constants';
import type { RuleCreateProps } from '../../../common/detection_engine/rule_schema';
import { internalAlertingSnoozeRule } from '../../urls/navigation';

export const createRule = <T = unknown>(
  rule: RuleCreateProps
): Cypress.Chainable<Cypress.Response<T>> => {
  return rootRequest<T>({
    method: 'POST',
    url: DETECTION_ENGINE_RULES_URL,
    body: rule,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

/**
 * Snoozes a rule via API
 *
 * @param id Rule's SO id
 * @param duration Snooze duration in milliseconds, -1 for indefinite
 */
export const snoozeRule = (id: string, duration: number): Cypress.Chainable =>
  cy.request({
    method: 'POST',
    url: internalAlertingSnoozeRule(id),
    body: {
      snooze_schedule: {
        duration,
        rRule: { dtstart: new Date().toISOString(), count: 1, tzid: moment().format('zz') },
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const deleteCustomRule = (ruleId = '1') => {
  rootRequest({
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

      rootRequest({
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
