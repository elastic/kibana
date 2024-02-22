/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../../tasks/common';
import { login } from '../../tasks/login';
import { visitPolicyDetailsPage } from '../../screens/policy_details';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { APP_POLICIES_PATH } from '../../../../../common/constants';

describe(
  'When displaying the Policy Details in Security Essentials PLI',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
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

    it('should display upselling section for protections', () => {
      visitPolicyDetailsPage(policyId);
      cy.getByTestSubj('endpointPolicy-protectionsLockedCard', { timeout: 60000 })
        .should('exist')
        .and('be.visible');
    });
    it('should display upselling section for protection updates', () => {
      loadPage(`${APP_POLICIES_PATH}/${policyId}/protectionUpdates`);
      [
        'endpointPolicy-protectionUpdatesLockedCard-title',
        'endpointPolicy-protectionUpdatesLockedCard',
        'endpointPolicy-protectionUpdatesLockedCard-badge',
      ].forEach((testSubj) => {
        cy.getByTestSubj(testSubj, { timeout: 60000 }).should('exist').and('be.visible');
      });
      cy.getByTestSubj('protection-updates-layout').should('not.exist');
    });
  }
);
