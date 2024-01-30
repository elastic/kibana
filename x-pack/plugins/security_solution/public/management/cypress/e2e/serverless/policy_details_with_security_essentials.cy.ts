/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { visitPolicyDetailsPage } from '../../screens/policy_details';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';

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

    before(() => {
      cy.task(
        'indexFleetEndpointPolicy',
        { policyName: 'tests-serverless' },
        { timeout: 5 * 60 * 1000 }
      ).then((response) => {
        loadedPolicyData = response as IndexedFleetEndpointPolicyResponse;
      });
    });

    after(() => {
      if (loadedPolicyData) {
        cy.task('deleteIndexedFleetEndpointPolicies', loadedPolicyData);
      }
    });

    beforeEach(() => {
      login();
      visitPolicyDetailsPage(loadedPolicyData.integrationPolicies[0].id);
    });

    it('should display upselling section for protections', () => {
      cy.getByTestSubj('endpointPolicy-protectionsLockedCard', { timeout: 60000 })
        .should('exist')
        .and('be.visible');
    });
  }
);
