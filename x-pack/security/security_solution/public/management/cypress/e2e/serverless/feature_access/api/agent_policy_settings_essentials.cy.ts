/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateAgentPolicyResponse } from '@kbn/fleet-plugin/common/types';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createAgentPolicyTask,
  createAgentPolicyWithAgentTamperProtectionsEnabled,
  enableAgentTamperProtectionFeatureFlagInPolicy,
  getEndpointIntegrationVersion,
} from '../../../../tasks/fleet';
import { login } from '../../../../tasks/login';

describe(
  'Agent policy settings API operations on Essentials',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;

    beforeEach(() => {
      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
        })
      );
      login();
    });

    afterEach(() => {
      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      }
    });

    describe('Agent tamper protections', () => {
      it('throw error when trying to update agent policy settings', () => {
        enableAgentTamperProtectionFeatureFlagInPolicy(indexedPolicy.agentPolicies[0].id, {
          failOnStatusCode: false,
        }).then((res) => {
          const response = res as Cypress.Response<UpdateAgentPolicyResponse & { message: string }>;
          expect(response.status).to.equal(403);
          expect(response.body.message).to.equal(
            'Agent Tamper Protection is not allowed in current environment'
          );
        });
      });
      it('throw error when trying to create agent policy', () => {
        createAgentPolicyWithAgentTamperProtectionsEnabled({ failOnStatusCode: false }).then(
          (res) => {
            const response = res as Cypress.Response<
              UpdateAgentPolicyResponse & { message: string }
            >;
            expect(response.status).to.equal(403);
            expect(response.body.message).to.equal(
              'Agent Tamper Protection is not allowed in current environment'
            );
          }
        );
      });
    });
  }
);
