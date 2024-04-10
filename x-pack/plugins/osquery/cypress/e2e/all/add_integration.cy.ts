/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import {
  ADD_PACK_HEADER_BUTTON,
  ADD_QUERY_BUTTON,
  formFieldInputSelector,
  SAVED_QUERY_DROPDOWN_SELECT,
  TABLE_ROWS,
} from '../../screens/packs';
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
  checkDataStreamsInPolicyDetails,
} from '../../tasks/integrations';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Add Integration', { tags: ['@ess', '@serverless'] }, () => {
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.PLATFORM_ENGINEER);
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it(
    'validate osquery is not available and nav search links to integration',
    { tags: ['@ess', '@brokenInServerless'] },
    () => {
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
    }
  );

  describe('Add and upgrade integration', { tags: ['@ess', '@serverless'] }, () => {
    const oldVersion = '0.7.4';
    const [integrationName, policyName] = generateRandomStringName(2);
    let policyId: string;

    beforeEach(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
    });

    afterEach(() => {
      cleanupAgentPolicy(policyId);
    });

    it('should add the old integration and be able to upgrade it', { tags: '@ess' }, () => {
      cy.visit(createOldOsqueryPath(oldVersion));
      addCustomIntegration(integrationName, policyName);
      policyContainsIntegration(integrationName, policyName);
      checkDataStreamsInPolicyDetails();
      cy.contains(`version: ${oldVersion}`);
      cy.getBySel('euiFlyoutCloseButton').click();
      cy.getBySel('PackagePoliciesTableUpgradeButton').click();
      cy.getBySel('saveIntegration').click();
      cy.contains(`Successfully updated '${integrationName}'`);
      // should include streams on edit (upgrade)
      policyContainsIntegration(integrationName, policyName);
      cy.contains(`version: ${oldVersion}`).should('not.exist');
    });
  });
  describe('Add integration to policy', () => {
    const [integrationName, policyName] = generateRandomStringName(2);
    let policyId: string;
    beforeEach(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
    });

    afterEach(() => {
      cleanupAgentPolicy(policyId);
    });

    it('add integration', () => {
      cy.visit(FLEET_AGENT_POLICIES);
      cy.getBySel('createAgentPolicyButton').click();
      cy.getBySel('createAgentPolicyNameField').type(policyName);
      cy.getBySel('createAgentPolicyFlyoutBtn').click();
      cy.getBySel('agentPolicyNameLink').contains(policyName).click();
      cy.getBySel('addPackagePolicyButton').click();
      cy.getBySel('epmList.searchBar').type('osquery');
      cy.getBySel('integration-card:epr:osquery_manager').click();
      cy.getBySel('addIntegrationPolicyButton').click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');

      cy.getBySel('agentPolicySelect').within(() => {
        cy.contains(policyName);
      });
      cy.getBySel('packagePolicyNameInput').clear().wait(500);
      cy.getBySel('packagePolicyNameInput').type(`${integrationName}`);
      cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
      cy.getBySel('confirmModalCancelButton').click();
      cy.get(`[title="${integrationName}"]`).should('exist');
      policyContainsIntegration(integrationName, policyName);
      checkDataStreamsInPolicyDetails();
      cy.visit(OSQUERY);
      cy.contains('Live queries history');
    });
  });

  describe('Upgrade policy with existing packs', () => {
    const oldVersion = '1.2.0';
    const [policyName, integrationName, packName] = generateRandomStringName(3);
    let policyId: string;
    let packId: string;

    beforeEach(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
      interceptPackId((pack) => {
        packId = pack;
      });
    });

    afterEach(() => {
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
      checkDataStreamsInPolicyDetails();
      cy.contains(`version: ${oldVersion}`);
      cy.getBySel('euiFlyoutCloseButton').click();

      navigateTo('app/osquery/packs');
      cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');

      cy.get(formFieldInputSelector('name')).type(`${packName}{downArrow}{enter}`);
      cy.getBySel('policyIdsComboBox').type(`${policyName} {downArrow}{enter}`);

      cy.getBySel(ADD_QUERY_BUTTON).click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel(LIVE_QUERY_EDITOR).should('exist');
      cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).click().type('{downArrow}{enter}');
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
      checkDataStreamsInPolicyDetails();
      // test list of prebuilt queries
      navigateTo('/app/osquery/saved_queries');
      cy.get(TABLE_ROWS).should('have.length.above', 5);
    });
  });
});
