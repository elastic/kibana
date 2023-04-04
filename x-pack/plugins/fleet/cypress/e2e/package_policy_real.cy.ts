/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  INTEGRATION_NAME_LINK,
  POLICY_EDITOR,
} from '../screens/integrations';
import { EXISTING_HOSTS_TAB } from '../screens/fleet';
import { CONFIRM_MODAL } from '../screens/navigation';

const TEST_PACKAGE = 'input_package-1.0.0';
const agentPolicyId = 'test-input-package-policy';
const agentPolicyName = 'Test input package policy';
const inputPackagePolicyName = 'input-package-policy';

function editPackagePolicyandShowAdvanced() {
  cy.visit(`/app/integrations/detail/${TEST_PACKAGE}/policies`);

  cy.getBySel(INTEGRATION_NAME_LINK).contains(inputPackagePolicyName).click();

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

    cy.getBySel(POLICY_EDITOR.POLICY_NAME_INPUT).click().clear().type(inputPackagePolicyName);
    cy.getBySel('multiTextInput-paths')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('/var/log/test.log');

    cy.getBySel('multiTextInput-tags')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('tag1');

    cy.getBySel(POLICY_EDITOR.DATASET_SELECT).click().type('testdataset');

    cy.getBySel(EXISTING_HOSTS_TAB).click();

    cy.getBySel(POLICY_EDITOR.AGENT_POLICY_SELECT).click().get(`#${agentPolicyId}`).click();
    cy.wait(500); // wait for policy id to be set
    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();

    cy.getBySel(CONFIRM_MODAL.CANCEL_BUTTON).click();
  });

  it('should show pipelines editor with link to pipeline', () => {
    editPackagePolicyandShowAdvanced();
    cy.getBySel(POLICY_EDITOR.INSPECT_PIPELINES_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
    cy.get('body').should('not.contain', 'Pipeline not found');
    cy.get('body').should('contain', '"managed_by": "fleet"');
  });
  it('should show mappings editor with link to create custom template', () => {
    editPackagePolicyandShowAdvanced();
    cy.getBySel(POLICY_EDITOR.EDIT_MAPPINGS_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
    cy.get('body').should('contain', 'logs-testdataset@custom');
  });
});
