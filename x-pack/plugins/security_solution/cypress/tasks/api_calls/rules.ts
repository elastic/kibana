/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { rootRequest } from '../common';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '../../../common/constants';
import type { RuleCreateProps, RuleResponse } from '../../../common/api/detection_engine';
import { internalAlertingSnoozeRule } from '../../urls/routes';
import type { FetchRulesResponse } from '../../../public/detection_engine/rule_management/logic/types';

export const createRule = (
  rule: RuleCreateProps
): Cypress.Chainable<Cypress.Response<RuleResponse>> => {
  return rootRequest<RuleResponse>({
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

export const waitForRulesToFinishExecution = (ruleIds: string[], afterDate?: Date) =>
  cy.waitUntil(
    () =>
      rootRequest<FetchRulesResponse>({
        method: 'GET',
        url: DETECTION_ENGINE_RULES_URL_FIND,
      }).then((response) => {
        const areAllRulesFinished = ruleIds.every((ruleId) =>
          response.body.data.some((rule) => {
            const ruleExecutionDate = rule.execution_summary?.last_execution?.date;

            const isDateOk = afterDate
              ? !!(ruleExecutionDate && new Date(ruleExecutionDate) > afterDate)
              : true;

            return (
              rule.rule_id === ruleId && typeof rule.execution_summary !== 'undefined' && isDateOk
            );
          })
        );
        return areAllRulesFinished;
      }),
    { interval: 500, timeout: 12000 }
  );
