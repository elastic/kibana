/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../../../tasks/login';
import { loadPage } from '../../../../tasks/common';
import { APP_POLICIES_PATH } from '../../../../../../../common/constants';

describe(
  'When displaying the Policy Details in Endpoint Essentials PLI',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    let loadedPolicyData: IndexedFleetEndpointPolicyResponse;
    let policyId: string;

    before(() => {
      cy.task(
        'indexFleetEndpointPolicy',
        { policyName: 'tests-serverless' },
        { timeout: 5 * 60 * 1000 }
      ).then((res) => {
        const response = res as IndexedFleetEndpointPolicyResponse;
        loadedPolicyData = response;
        policyId = response.integrationPolicies[0].id;
      });
    });

    after(() => {
      if (loadedPolicyData) {
        cy.task('deleteIndexedFleetEndpointPolicies', loadedPolicyData);
      }
    });

    beforeEach(() => {
      login();
    });

    it('should not display upselling section for protection updates', () => {
      loadPage(`${APP_POLICIES_PATH}/${policyId}/protectionUpdates`);
      [
        'endpointPolicy-protectionUpdatesLockedCard-title',
        'endpointPolicy-protectionUpdatesLockedCard',
        'endpointPolicy-protectionUpdatesLockedCard-badge',
      ].forEach((testSubj) => {
        cy.getByTestSubj(testSubj).should('not.exist');
      });
      [
        'protection-updates-warning-callout',
        'protection-updates-automatic-updates-enabled',
        'protection-updates-manifest-switch',
        'protection-updates-manifest-name-title',
      ].forEach((testSubj) => {
        cy.getByTestSubj(testSubj).should('exist').and('be.visible');
      });
    });

    it(`should not display upselling section for custom notification`, () => {
      const testData = ['malware', 'ransomware', 'memory', 'behaviour'];

      loadPage(`${APP_POLICIES_PATH}/${policyId}/settings`);

      testData.forEach((protection) => {
        cy.getByTestSubj(`endpointPolicyForm-${protection}`).within(() => {
          cy.getByTestSubj(`endpointPolicyForm-${protection}-enableDisableSwitch`).click();
          // User should not see the locked card since the feature is available under Endpoint Complete tier
          [
            'endpointPolicy-customNotificationLockedCard-title',
            'endpointPolicy-customNotificationLockedCard',
            'endpointPolicy-customNotificationLockedCard-badge',
          ].forEach((testSubj) => {
            cy.getByTestSubj(testSubj).should('not.exist');
          });
          // User should see the custom notification section
          cy.getByTestSubj(`endpointPolicyForm-${protection}-notifyUser-customMessage`)
            .should('exist')
            .and('be.visible');
        });
      });
    });
  }
);
