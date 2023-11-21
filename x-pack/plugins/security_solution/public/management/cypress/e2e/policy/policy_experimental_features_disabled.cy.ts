/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../common/endpoint/types';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';

// We need a way to disable experimental features in the Cypress tests
describe.skip(
  'Disabled experimental features on: ',
  {
    tags: [
      '@ess',
      '@serverless',
      // Not supported in serverless!
      // The `disableExpandableFlyoutAdvancedSettings()` fails because the API
      // `internal/kibana/settings` is not accessible in serverless
      '@brokenInServerless',
    ],
  },
  () => {
    describe('Policy list', () => {
      describe('Renders policy list without protection updates feature flag', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;

        beforeEach(() => {
          login();
          disableExpandableFlyoutAdvancedSettings();
        });

        before(() => {
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
            });
          });
        });

        after(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });

        it('should render the list', () => {
          loadPage('/app/security/administration/policy');
          cy.getByTestSubj('tableHeaderCell_Name_0');
          cy.getByTestSubj('tableHeaderCell_Deployed Version_1').should('not.exist');
          cy.getByTestSubj('tableHeaderCell_created_by_1');
          cy.getByTestSubj('tableHeaderCell_created_at_2');
          cy.getByTestSubj('tableHeaderCell_updated_by_3');
          cy.getByTestSubj('tableHeaderCell_updated_at_4');
          cy.getByTestSubj('tableHeaderCell_Endpoints_5');
          cy.getByTestSubj('policy-list-outdated-manifests-call-out').should('not.exist');
          cy.getByTestSubj('policyDeployedVersion').should('not.exist');
        });
      });
    });

    describe('Policy details', () => {
      describe('Renders policy details without protection updates feature flag', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;
        let policy: PolicyData;

        beforeEach(() => {
          login();
          disableExpandableFlyoutAdvancedSettings();
        });

        before(() => {
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
              policy = indexedPolicy.integrationPolicies[0];
            });
          });
        });

        after(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });

        it('should return 404 on policyUpdates url', () => {
          loadPage(`/app/security/administration/policy/${policy.id}/protectionUpdates`);
          cy.getByTestSubj('notFoundPage');
          cy.getByTestSubj('protection-updates-automatic-updates-enabled').should('not.exist');
        });

        it('should render policy details without protection updates tab', () => {
          loadPage(`/app/security/administration/policy/${policy.id}`);
          cy.get('div[role="tablist"]').within(() => {
            cy.contains('Protection updates').should('not.exist');
            cy.get('#settings');
            cy.get('#trustedApps');
            cy.get('#hostIsolationExceptions');
            cy.get('#blocklists');
            cy.get('#protectionUpdates').should('not.exist');
          });
        });
      });
    });
  }
);
