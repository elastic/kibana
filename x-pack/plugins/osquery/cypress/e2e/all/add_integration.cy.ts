/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import {
  cleanupPack,
  cleanupAgentPolicy,
  cleanupSavedQuery,
  loadSavedQuery,
} from '../../tasks/api_fixtures';
import { CREATE_PACKAGE_POLICY_SAVE_BTN } from '../../screens/integrations';
import {
  createOldOsqueryPath,
  FLEET_AGENT_POLICIES,
  NAV_SEARCH_INPUT_OSQUERY_RESULTS,
  navigateTo,
  OSQUERY,
} from '../../tasks/navigation';
import {
  addCustomIntegration,
  closeModalIfVisible,
  generateRandomStringName,
  integrationExistsWithinPolicyDetails,
  interceptPackId,
  interceptAgentPolicyId,
  policyContainsIntegration,
} from '../../tasks/integrations';
import { findAndClickButton, findFormFieldByRowsLabelAndType } from '../../tasks/live_query';

describe('ALL - Add Integration', { tags: ['@ess', '@brokenInServerless'] }, () => {
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
    });
  });

  beforeEach(() => {
    cy.login('elastic');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it('validate osquery is not available and nav search links to integration', () => {
    cy.visit(OSQUERY);
    cy.intercept('GET', '**/internal/osquery/status', (req) => {
      req.continue((res) => res.send({ ...res.body, install_status: undefined }));
    });
    cy.contains('Add this integration to run and schedule queries for Elastic Agent.');
    cy.contains('Add Osquery Manager');
    cy.getBySel('osquery-add-integration-button');
    cy.getBySel('nav-search-input').type('Osquery');
    cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.MANAGEMENT}"]`).should('exist');
    cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.LOGS}"]`).should('exist');
    cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.MANAGER}"]`).should('exist').click();
  });

  describe('Add and upgrade integration', { tags: ['@ess'] }, () => {
    const oldVersion = '0.7.4';
    const [integrationName, policyName] = generateRandomStringName(2);
    let policyId: string;

    before(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
    });

    after(() => {
      cleanupAgentPolicy(policyId);
    });

    it('should add the old integration and be able to upgrade it', { tags: '@ess' }, () => {
      cy.visit(createOldOsqueryPath(oldVersion));
      addCustomIntegration(integrationName, policyName);
      policyContainsIntegration(integrationName, policyName);
      cy.contains(`version: ${oldVersion}`);
      cy.getBySel('euiFlyoutCloseButton').click();
      cy.getBySel('PackagePoliciesTableUpgradeButton').click();
      cy.getBySel('saveIntegration').click();
      cy.contains(`Successfully updated '${integrationName}'`);
      policyContainsIntegration(integrationName, policyName);
      cy.contains(`version: ${oldVersion}`).should('not.exist');
    });
  });

  describe('Add integration to policy', () => {
    const [integrationName, policyName] = generateRandomStringName(2);
    let policyId: string;

    before(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
    });

    after(() => {
      cleanupAgentPolicy(policyId);
    });

    it('add integration', () => {
      cy.visit(FLEET_AGENT_POLICIES);
      cy.getBySel('createAgentPolicyButton').click();
      cy.getBySel('createAgentPolicyNameField').type(policyName);
      cy.getBySel('createAgentPolicyFlyoutBtn').click();
      cy.getBySel('agentPolicyNameLink').contains(policyName).click();
      cy.getBySel('addPackagePolicyButton').click();
      cy.getBySel('integration-card:epr:osquery_manager').click();
      cy.getBySel('addIntegrationPolicyButton').click();
      cy.getBySel('agentPolicySelect').within(() => {
        cy.contains(policyName);
      });
      cy.getBySel('packagePolicyNameInput')
        .wait(500)
        .type(`{selectall}{backspace}${integrationName}`);
      cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
      cy.getBySel('confirmModalCancelButton').click();
      cy.get(`[title="${integrationName}"]`).should('exist');
      cy.visit(OSQUERY);
      cy.contains('Live queries history');
    });
  });

  describe('Upgrade policy with existing packs', () => {
    const oldVersion = '1.2.0';
    const [policyName, integrationName, packName] = generateRandomStringName(3);
    let policyId: string;
    let packId: string;

    before(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
      interceptPackId((pack) => {
        packId = pack;
      });
    });

    after(() => {
      cleanupPack(packId);
      cleanupAgentPolicy(policyId);
    });

    it('should have integration and packs copied when upgrading integration', () => {
      cy.visit(`app/integrations/detail/osquery_manager-${oldVersion}/overview`);
      addCustomIntegration(integrationName, policyName);
      cy.getBySel('integrationPolicyUpgradeBtn');
      cy.get(`[title="${policyName}"]`).click();
      cy.get(`[title="${integrationName}"]`)
        .parents('tr')
        .within(() => {
          cy.contains('Osquery Manager');
          cy.getBySel('PackagePoliciesTableUpgradeButton');
          cy.contains(`v${oldVersion}`);
          cy.getBySel('agentActionsBtn').click();
        });
      integrationExistsWithinPolicyDetails(integrationName);
      cy.contains(`version: ${oldVersion}`);
      cy.getBySel('euiFlyoutCloseButton').click();

      navigateTo('app/osquery/packs');
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', packName);
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        `${policyName} {downArrow}{enter}{esc}`
      );
      findAndClickButton('Add query');
      cy.getBySel('savedQuerySelect').click().type('{downArrow}{enter}');
      cy.contains(/^Save$/).click();
      cy.contains(/^Save pack$/).click();
      cy.contains(`Successfully created "${packName}" pack`).click();
      cy.visit('app/fleet/policies');
      cy.get(`[title="${policyName}"]`).click();
      cy.getBySel('PackagePoliciesTableUpgradeButton').click();
      cy.contains(/^Advanced$/).click();
      cy.get('.kibanaCodeEditor').should('contain', `"${packName}":`);
      cy.getBySel('saveIntegration').click();
      cy.get(`a[title="${integrationName}"]`).click();
      cy.contains(/^Advanced$/).click();
      cy.get('.kibanaCodeEditor').should('contain', `"${packName}":`);
      cy.contains('Cancel').click();
      closeModalIfVisible();
      cy.get(`[title="${integrationName}"]`)
        .parents('tr')
        .within(() => {
          cy.getBySel('PackagePoliciesTableUpgradeButton').should('not.exist');
          cy.contains('Osquery Manager').and('not.contain', `v${oldVersion}`);
        });
      integrationExistsWithinPolicyDetails(integrationName);

      // test list of prebuilt queries
      navigateTo('/app/osquery/saved_queries');
      cy.waitForReact();
      cy.react('EuiTableRow').should('have.length.above', 5);
    });
  });
});
