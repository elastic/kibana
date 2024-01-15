/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { setCustomProtectionUpdatesManifestVersion } from '../../tasks/endpoint_policy';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';

describe(
  'Policy List',
  {
    // Not supported in serverless!
    // The `disableExpandableFlyoutAdvancedSettings()` fails because the API
    // `internal/kibana/settings` is not accessible in serverless
    tags: ['@ess', '@serverless', '@brokenInServerless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'protectionUpdatesEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    // Today API wont let us create a policy with a manifest version before October 1st 2023
    describe.skip('Renders policy list with outdated policies', () => {
      const indexedPolicies: IndexedFleetEndpointPolicyResponse[] = [];

      const monthAgo = moment.utc().subtract(1, 'months').format('YYYY-MM-DD');
      const threeDaysAgo = moment.utc().subtract(3, 'days').format('YYYY-MM-DD');
      const eighteenMonthsAgo = moment
        .utc()
        .subtract(18, 'months')
        .add(1, 'day')
        .format('YYYY-MM-DD');
      const dates = [monthAgo, threeDaysAgo, eighteenMonthsAgo];

      beforeEach(() => {
        login();
        disableExpandableFlyoutAdvancedSettings();
      });

      before(() => {
        getEndpointIntegrationVersion().then((version) => {
          for (let i = 0; i < 4; i++) {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicies.push(data);
              if (dates[i]) {
                setCustomProtectionUpdatesManifestVersion(data.integrationPolicies[0].id, dates[i]);
              }
            });
          }
        });
      });

      after(() => {
        if (indexedPolicies.length) {
          indexedPolicies.forEach((policy) => {
            cy.task('deleteIndexedFleetEndpointPolicies', policy);
          });
        }
      });

      it('should render the policy list', () => {
        loadPage('/app/security/administration/policy');
        cy.getByTestSubj('policy-list-outdated-manifests-call-out').should('contain', '2 policies');
        dates.forEach((date) => {
          cy.contains(moment.utc(date, 'YYYY-MM-DD').format('MMMM DD, YYYY'));
        });
        cy.getByTestSubj('policyDeployedVersion').should('have.length', 4);
      });
    });

    describe('Renders policy list with no outdated policies', () => {
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
        cy.getByTestSubj('policy-list-outdated-manifests-call-out').should('not.exist');
        cy.getByTestSubj('policyDeployedVersion').should('have.length', 1);
        cy.getByTestSubj('policyDeployedVersion').should('have.text', 'latest');
      });
    });
  }
);
