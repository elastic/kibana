/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_SECURITY_RULE_ID } from '../../../common/detection_engine/constants';
import type { PrePackagedRulesStatusResponse } from '../../../public/detection_engine/rule_management/logic/types';
import { getPrebuiltRuleWithExceptionsMock } from '../../../server/lib/detection_engine/prebuilt_rules/mocks';
import { createRuleAssetSavedObject, createRuleSavedObject } from '../../helpers/rules';

export const getPrebuiltRulesStatus = () => {
  return cy.request<PrePackagedRulesStatusResponse>({
    method: 'GET',
    url: 'api/detection_engine/rules/prepackaged/_status',
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};

export const getAvailablePrebuiltRulesCount = () => {
  cy.log('Get prebuilt rules count');
  return getPrebuiltRulesStatus().then(({ body }) => {
    const prebuiltRulesCount = body.rules_installed + body.rules_not_installed;

    return prebuiltRulesCount;
  });
};

export const waitTillPrebuiltRulesReadyToInstall = () => {
  cy.waitUntil(
    () => {
      return getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
        return availablePrebuiltRulesCount > 0;
      });
    },
    { interval: 2000, timeout: 60000 }
  );
};

export const SAMPLE_PREBUILT_RULE = createRuleAssetSavedObject({
  ...getPrebuiltRuleWithExceptionsMock(),
  rule_id: ELASTIC_SECURITY_RULE_ID,
  tags: ['test-tag-1'],
  enabled: true,
});

export const createNewRuleAsset = ({
  index = '.kibana_security_solution',
  rule = SAMPLE_PREBUILT_RULE,
}: {
  index?: string;
  rule?: typeof SAMPLE_PREBUILT_RULE;
}) => {
  const url = `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_doc/security-rule:${
    rule['security-rule'].rule_id
  }`;
  cy.waitUntil(
    () => {
      return cy
        .request({
          method: 'PUT',
          url,
          headers: { 'kbn-xsrf': 'cypress-creds', 'Content-Type': 'application/json' },
          failOnStatusCode: false,
          body: rule,
        })
        .then((response) => {
          if (response.status !== 200) {
            return false;
          }
          return true;
        });
    },
    { interval: 500, timeout: 12000 }
  );
};

export const SAMPLE_RULE = createRuleSavedObject({
  rule_id: ELASTIC_SECURITY_RULE_ID,
  tags: ['test-tag-1'],
  enabled: true,
});

export const installAvailableRules = () => {
  cy.waitUntil(
    () => {
      return cy
        .request({
          method: 'PUT',
          url: 'api/detection_engine/rules/prepackaged',
          headers: { 'kbn-xsrf': 'cypress-creds', 'Content-Type': 'application/json' },
          failOnStatusCode: false,
        })
        .then((response) => {
          if (response.status !== 200) {
            return false;
          }
          return true;
        });
    },
    { interval: 500, timeout: 12000 }
  );
};
