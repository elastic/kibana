/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrePackagedRulesStatusResponse } from '../../../public/detection_engine/rule_management/logic/types';

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

export const createNewRuleAsset = (index: string, initialNumberOfDocuments: number) => {
  cy.waitUntil(
    () => {
      return cy
        .request({
          method: 'PUT',
          url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
          headers: { 'kbn-xsrf': 'cypress-creds' },
          failOnStatusCode: false,
          body: {},
        })
        .then((response) => {
          if (response.status !== 200) {
            return false;
          } else {
            return response.body.hits.hits.length > initialNumberOfDocuments;
          }
        });
    },
    { interval: 500, timeout: 12000 }
  );
};
