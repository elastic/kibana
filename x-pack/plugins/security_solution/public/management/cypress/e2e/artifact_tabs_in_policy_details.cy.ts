/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestsData } from '../fixtures/artifacts_page';
import {
  loadEndpointDataForEventFiltersIfNeeded,
  removeAllArtifacts,
} from '../tasks/artifact_helpers';
import { login, loginWithRole, ROLE } from '../tasks/login';
import { performUserActions } from '../tasks/perform_user_actions';

const visitArtifactTab = (tabId: string) => {
  loginWithWriteAccess(`/app/security/administration/policy`);
  cy.getBySel('policyNameCellLink').eq(0).click({ force: true });
  cy.getBySel('policyDetailsPage').should('exist');
  cy.get(`#${tabId}`).click();
};

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.endpoint_security_policy_manager);
  cy.visit(url);
};

describe('Artifact tabs in Policy Details page', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();
    removeAllArtifacts();
  });

  after(() => {
    removeAllArtifacts();
  });

  for (const testData of getArtifactsListTestsData()) {
    describe(`${testData.title} tab`, () => {
      it(`[ALL] Given there are no ${testData.title} entries, user can add an artifact`, () => {
        visitArtifactTab(testData.tabId);

        cy.getBySel('unexisting-manage-artifacts-button').should('exist').click();

        const { formActions, checkResults } = testData.create;

        performUserActions(formActions);

        // Add a per policy artifact - but not assign it to any policy
        cy.contains('Per Policy').click();
        cy.getBySel(`${testData.pagePrefix}-flyout-submitButton`).click();

        // Check new artifact is in the list
        for (const checkResult of checkResults) {
          cy.getBySel(checkResult.selector).should('have.text', checkResult.value);
        }

        cy.getBySel('policyDetailsPage').should('not.exist');
        cy.getBySel('backToOrigin').contains(/^Back to .+ policy$/);

        cy.getBySel('backToOrigin').click();
        cy.getBySel('policyDetailsPage').should('exist');
      });

      it(`[ALL] Given there are no assigned ${testData.title} entries, user can Manage and Assign artifacts`, () => {
        visitArtifactTab(testData.tabId);

        // Manage artifacts
        cy.getBySel('unassigned-manage-artifacts-button').should('exist').click();
        cy.location('pathname').should('equal', `/app/security/administration/${testData.urlPath}`);
        cy.getBySel('backToOrigin').click();

        // Assign artifacts
        cy.getBySel('unassigned-assign-artifacts-button').should('exist').click();

        cy.getBySel('artifacts-assign-flyout').should('exist');
        cy.getBySel('artifacts-assign-confirm-button').should('be.disabled');

        cy.getBySel(`${testData.artifactName}_checkbox`).click();
        cy.getBySel('artifacts-assign-confirm-button').click();
      });

      it(`[ALL] Given there are assigned ${testData.title} entries, user can see the artifacts and assign other artifacts`, () => {
        visitArtifactTab(testData.tabId);

        // List of artifacts
        cy.getBySel('artifacts-collapsed-list-card').should('have.length', 1);
        cy.getBySel('artifacts-collapsed-list-card-header-titleHolder').contains(
          testData.artifactName
        );

        // Assign artifacts
        cy.getBySel('artifacts-assign-button').should('exist').click();
        cy.getBySel('artifacts-assign-flyout').should('exist');
      });

      it(`[ALL] Given there are assigned ${testData.title} entries, user can unassign a "per policy" artifact from the policy`, () => {
        visitArtifactTab(testData.tabId);

        cy.getBySel('artifacts-collapsed-list-card-header-actions-button').click();
        cy.getBySel('remove-from-policy-action').click();
        cy.getBySel('confirmModalConfirmButton').click();

        cy.contains('Successfully removed');
      });
    });
  }
});
