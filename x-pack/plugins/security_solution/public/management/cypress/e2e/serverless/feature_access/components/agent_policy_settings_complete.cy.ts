/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../../../tasks/fleet';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../../../../common/endpoint/types';

const getFleetAgentPolicySettingsUrl = (policyId: string) =>
  `/app/fleet/policies/${policyId}/settings`;

describe(
  'Agent Policy Settings - Complete',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    describe('Agent Tamper Protection is available with no upselling component present', () => {
      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;

      beforeEach(() => {
        getEndpointIntegrationVersion().then((version) =>
          createAgentPolicyTask(version).then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];
          })
        );
        login();
      });

      afterEach(() => {
        if (indexedPolicy) {
          cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
        }
      });

      it('should display upselling section for protections', () => {
        loadPage(getFleetAgentPolicySettingsUrl(policy.policy_id));
        cy.getByTestSubj('endpointSecurity-agentTamperProtectionLockedCard-badge').should(
          'not.exist'
        );
        cy.getByTestSubj('endpointSecurity-agentTamperProtectionLockedCard-title').should(
          'not.exist'
        );
        cy.getByTestSubj('endpointPolicy-agentTamperProtectionLockedCard').should('not.exist');

        cy.getByTestSubj('tamperProtectionSwitch');
        cy.getByTestSubj('tamperMissingIntegrationTooltip').should('not.exist');
        cy.getByTestSubj('uninstallCommandLink');
      });
    });
  }
);
