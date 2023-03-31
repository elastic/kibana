/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_INTEGRATION_POLICY_BTN } from '../screens/integrations';

export {};

const TEST_PACKAGE = 'input_package-1.0.0';
const agentPolicyId = 'test-input-package-policy-2';
const agentPolicyName = 'Test input package policy-2';
const inputPackagePolicyName = 'input-package-policy-2';

function editPackagePolicyandShowAdvanced() {
  cy.visit(`/app/integrations/detail/${TEST_PACKAGE}/policies`);

  cy.getBySel('integrationNameLink').contains(inputPackagePolicyName).click();

  cy.get('button').contains('Change defaults').click();
  cy.get('[data-test-subj^="advancedStreamOptionsToggle"]').click();
}
describe('Input package create and edit package policy', () => {
  before(() => {
    cy.task('installTestPackage', TEST_PACKAGE);

    cy.request({
      method: 'POST',
      url: `/api/fleet/agent_policies`,
      body: {
        id: agentPolicyId,
        name: agentPolicyName,
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: [],
      },
      headers: { 'kbn-xsrf': 'cypress' },
    });
  });
  after(() => {
    // delete agent policy
    cy.request({
      method: 'POST',
      url: `/api/fleet/agent_policies/delete`,
      headers: { 'kbn-xsrf': 'cypress' },
      body: JSON.stringify({
        agentPolicyId,
      }),
    });
    cy.task('uninstallTestPackage', TEST_PACKAGE);
  });
  it('should successfully create a package policy', () => {
    cy.visit(`/app/integrations/detail/${TEST_PACKAGE}/overview`);
    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();

    cy.getBySel('packagePolicyNameInput').click().clear().type(inputPackagePolicyName);
    cy.getBySel('multiTextInput-paths')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('/var/log/test.log');

    cy.getBySel('multiTextInput-tags')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('tag1');

    cy.getBySel('datasetComboBox').click().type('testdataset');

    cy.getBySel('existingHostsTab').click();

    cy.getBySel('agentPolicySelect').click().get(`#${agentPolicyId}`).click();
    cy.wait(500); // wait for policy id to be set
    cy.getBySel('createPackagePolicySaveButton').click();

    cy.getBySel('confirmModalCancelButton').click();
  });

  it('should show pipelines editor with link to pipeline', () => {
    editPackagePolicyandShowAdvanced();
    cy.getBySel('datastreamInspectPipelineBtn').click();
    cy.getBySel('confirmModalConfirmButton').click();
    cy.get('body').should('not.contain', 'Pipeline not found');
    cy.get('body').should('contain', '"managed_by": "fleet"');
  });
  it('should show mappings editor with link to create custom template', () => {
    editPackagePolicyandShowAdvanced();
    cy.getBySel('datastreamEditMappingsBtn').click();
    cy.getBySel('confirmModalConfirmButton').click();
    cy.get('body').should('contain', 'logs-testdataset@custom');
  });
});
