/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { setCustomProtectionUpdatesManifestVersion } from '../../tasks/endpoint_policy';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';
import type { PolicyData } from '../../../../../common/endpoint/types';

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';

describe('Policy List', () => {
  describe('Renders policy list with outdated policies', () => {
    const indexedPolicies: IndexedFleetEndpointPolicyResponse[] = [];
    const policies: PolicyData[] = [];

    const monthAgo = moment().subtract(1, 'months').format('YYYY-MM-DD');
    const threeDaysAgo = moment().subtract(3, 'days').format('YYYY-MM-DD');
    const nineteenMonthsAgo = moment().subtract(19, 'months').format('YYYY-MM-DD');

    const dates = [monthAgo, threeDaysAgo, nineteenMonthsAgo];

    beforeEach(() => {
      login();
      disableExpandableFlyoutAdvancedSettings();
    });

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
        for (let i = 0; i < 4; i++) {
          createAgentPolicyTask(version).then((data) => {
            indexedPolicies.push(data);
            policies.push(data.integrationPolicies[0]);
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
        cy.contains(moment(date, 'YYYY-MM-DD').format('MMMM DD, YYYY'));
      });
      cy.getByTestSubj('policyDeployedVersion').should('have.length', 4);
    });
  });

  describe('Renders policy list with no outdated policies', () => {
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

    it('should render the list', () => {
      loadPage('/app/security/administration/policy');
      cy.getByTestSubj('policy-list-outdated-manifests-call-out').should('not.exist');
      cy.getByTestSubj('policyDeployedVersion').should('have.length', 1);
      cy.getByTestSubj('policyDeployedVersion').should('have.text', 'latest');
    });
  });
});
