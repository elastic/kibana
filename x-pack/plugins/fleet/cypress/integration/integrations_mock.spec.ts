/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../tasks/navigation';
import { UPDATE_PACKAGE_BTN } from '../screens/integrations';
import { AGENT_POLICY_SAVE_INTEGRATION } from '../screens/fleet';

describe('Add Integration - Mock API', () => {
  describe('upgrade package and upgrade package policy', () => {
    const oldVersion = '0.3.3';
    const newVersion = '1.3.4';
    beforeEach(() => {
      cy.intercept('/api/fleet/epm/packages?experimental=true', {
        items: [
          {
            name: 'apache',
            id: 'apache',
            version: newVersion,
            savedObject: { attributes: { version: oldVersion } },
            status: 'installed',
          },
        ],
      });

      cy.intercept(`/api/fleet/epm/packages/apache/${oldVersion}`, {
        item: {
          name: 'apache',
          version: oldVersion,
          latestVersion: newVersion,
          status: 'installed',
          assets: [],
          savedObject: { attributes: { version: oldVersion } },
        },
      });
      cy.intercept('/api/fleet/epm/packages/apache/stats', { response: { agent_policy_count: 1 } });
      cy.intercept('/api/fleet/package_policies?*', {
        items: [
          {
            name: 'apache-2',
            description: '',
            namespace: 'default',
            policy_id: 'policy-1',
            package: {
              name: 'apache',
              version: oldVersion,
            },
            updated_by: 'elastic',
          },
        ],
      });
      const policyConfig = {
        id: 'apache-2',
        name: 'apache-2',
        namespace: 'default',
        package: { name: 'apache', version: oldVersion },
        enabled: true,
        policy_id: 'policy-1',
        inputs: [],
      };
      cy.intercept('/api/fleet/package_policies/apache-2', {
        item: policyConfig,
      });
      cy.intercept('POST', '/api/fleet/package_policies/upgrade/dryrun', [
        {
          name: 'apache-2',
          diff: [
            policyConfig,
            { ...policyConfig, package: { ...policyConfig.package, version: newVersion } },
          ],
          hasErrors: false,
        },
      ]);
      cy.intercept('POST', `/api/fleet/epm/packages/apache/${newVersion}`, { items: [] });
      const agentPolicy = {
        id: 'policy-1',
        name: 'Agent policy 1',
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
        status: 'active',
        package_policies: [{ id: 'apache-2', name: 'apache-2', policy_id: 'policy-1', inputs: [] }],
      };
      cy.intercept('/api/fleet/agent_policies?*', { items: [agentPolicy] });
      cy.intercept('/api/fleet/agent_policies/policy-1', {
        item: agentPolicy,
      });
    });

    it('should upgrade policies without integration update', () => {
      navigateTo(`app/integrations/detail/apache-${oldVersion}/settings`);
      cy.get('.euiLoadingSpinner').should('not.exist');
      cy.getBySel('installedVersion').contains(oldVersion);

      cy.get('#upgradePoliciesCheckbox').uncheck({ force: true });

      cy.intercept(`/api/fleet/epm/packages/apache/${newVersion}`, {
        item: {
          name: 'apache',
          version: newVersion,
          latestVersion: newVersion,
          status: 'installed',
          assets: [],
          savedObject: { attributes: { version: newVersion } },
        },
      }).as('updatePackage');
      cy.getBySel(UPDATE_PACKAGE_BTN).click();
      cy.wait('@updatePackage');
      cy.get('#upgradePoliciesCheckbox').should('not.exist');
      cy.getBySel('installedVersion').contains(newVersion);
    });

    it('should upgrade integration policy', () => {
      cy.intercept('/api/fleet/epm/packages/apache/*', {
        item: {
          name: 'apache',
          version: newVersion,
          latestVersion: newVersion,
          status: 'installed',
          assets: [],
          savedObject: { attributes: { version: newVersion } },
        },
      });
      cy.intercept('/api/fleet/epm/packages/apache/stats', { response: { agent_policy_count: 1 } });
      cy.intercept('PUT', '/api/fleet/package_policies/apache-2', {
        item: {
          id: 'apache-2',
          name: 'apache-2',
          namespace: 'default',
          package: { name: 'apache', version: newVersion },
          enabled: true,
          policy_id: 'policy-1',
          inputs: [],
        },
      }).as('updateApachePolicy');

      navigateTo(
        '/app/fleet/policies/package-1/upgrade-package-policy/apache-2?from=integrations-policy-list'
      );

      cy.getBySel('toastCloseButton').click();
      cy.getBySel(AGENT_POLICY_SAVE_INTEGRATION).click();

      cy.wait('@updateApachePolicy').then((interception) => {
        expect(interception.request.body.package.version).to.equal(newVersion);
      });
    });
  });
});
