/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { setCustomProtectionUpdatesManifestVersion } from '../../tasks/endpoint_policy';
import { login, ROLE } from '../../tasks/login';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';

describe('Policy Details', () => {
  describe('Protection updates', () => {
    const loadProtectionUpdatesUrl = (policyId: string) =>
      loadPage(`/app/security/administration/policy/${policyId}/protectionUpdates`);

    describe('Renders and saves protection updates', () => {
      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;
      const today = moment();
      const formattedToday = today.format('MMMM DD, YYYY');

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

      it('should render the protection updates tab content', () => {
        loadProtectionUpdatesUrl(policy.id);
        cy.getByTestSubj('protection-updates-automatic-updates-enabled');
        cy.getByTestSubj('protection-updates-manifest-switch');
        cy.getByTestSubj('protection-updates-manifest-name-title');
        cy.getByTestSubj('protection-updates-manifest-name');

        cy.getByTestSubj('protection-updates-manifest-switch').click();

        cy.getByTestSubj('protection-updates-manifest-name-deployed-version-title');
        cy.getByTestSubj('protection-updates-deployed-version').contains('latest');
        cy.getByTestSubj('protection-updates-manifest-name-version-to-deploy-title');
        cy.getByTestSubj('protection-updates-version-to-deploy-picker').within(() => {
          cy.get('input').should('have.value', formattedToday);
        });
        cy.getByTestSubj('policyDetailsSaveButton');
      });

      it('should successfully update the manifest version to custom date', () => {
        loadProtectionUpdatesUrl(policy.id);
        cy.getByTestSubj('protection-updates-manifest-switch').click();
        cy.intercept('PUT', `/api/fleet/package_policies/${policy.id}`).as('policy');
        cy.getByTestSubj('policyDetailsSaveButton').click();
        cy.wait('@policy').then(({ request, response }) => {
          expect(request.body.inputs[0].config.policy.value.global_manifest_version).to.equal(
            today.format('YYYY-MM-DD')
          );
          expect(response?.statusCode).to.equal(200);
        });
        cy.getByTestSubj('protectionUpdatesSuccessfulMessage');
        cy.getByTestSubj('protection-updates-deployed-version').contains(formattedToday);
      });
    });

    describe('Renders and saves protection updates with custom version', () => {
      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;

      const twoMonthsAgo = moment().subtract(2, 'months').format('YYYY-MM-DD');

      beforeEach(() => {
        login();
        disableExpandableFlyoutAdvancedSettings();
      });

      before(() => {
        getEndpointIntegrationVersion().then((version) => {
          createAgentPolicyTask(version).then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];
            setCustomProtectionUpdatesManifestVersion(policy.id, twoMonthsAgo);
          });
        });
      });

      after(() => {
        if (indexedPolicy) {
          cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
        }
      });

      it('should update manifest version to latest when enabling automatic updates', () => {
        loadProtectionUpdatesUrl(policy.id);
        cy.getByTestSubj('protection-updates-manifest-outdated');
        cy.intercept('PUT', `/api/fleet/package_policies/${policy.id}`).as('policy_latest');

        cy.getByTestSubj('protection-updates-manifest-switch').click();
        cy.wait('@policy_latest').then(({ request, response }) => {
          expect(request.body.inputs[0].config.policy.value.global_manifest_version).to.equal(
            'latest'
          );
          expect(response?.statusCode).to.equal(200);
        });
        cy.getByTestSubj('protectionUpdatesSuccessfulMessage');
        cy.getByTestSubj('protection-updates-automatic-updates-enabled');
      });
    });

    describe('Renders read only protection updates for user without write permissions', () => {
      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;
      const twoMonthsAgo = moment().subtract(2, 'months');

      beforeEach(() => {
        login(ROLE.endpoint_security_policy_management_read);
        disableExpandableFlyoutAdvancedSettings();
      });

      before(() => {
        getEndpointIntegrationVersion().then((version) => {
          createAgentPolicyTask(version).then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];
            setCustomProtectionUpdatesManifestVersion(policy.id, twoMonthsAgo.format('YYYY-MM-DD'));
          });
        });
      });

      after(() => {
        if (indexedPolicy) {
          cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
        }
      });

      it('should render the protection updates tab content', () => {
        loadProtectionUpdatesUrl(policy.id);
        cy.getByTestSubj('protection-updates-manifest-switch').should('not.exist');
        cy.getByTestSubj('protection-updates-state-view-mode');
        cy.getByTestSubj('protection-updates-manifest-name-title');
        cy.getByTestSubj('protection-updates-manifest-name');

        cy.getByTestSubj('protection-updates-manifest-name-deployed-version-title');
        cy.getByTestSubj('protection-updates-deployed-version').contains(
          twoMonthsAgo.format('MMMM DD, YYYY')
        );
        cy.getByTestSubj('protection-updates-manifest-name-version-to-deploy-title');
        cy.getByTestSubj('protection-updates-version-to-deploy-view-mode');
        cy.getByTestSubj('protection-updates-version-to-deploy-picker').should('not.exist');
        cy.getByTestSubj('policyDetailsSaveButton').should('be.disabled');
      });
    });
  });
});
