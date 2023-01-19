/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormAction } from '../fixtures/artifacts_page';
import { getArtifactsListTestsData } from '../fixtures/artifacts_page';
import {
  loadEndpointDataForEventFiltersIfNeeded,
  removeAllArtifacts,
} from '../tasks/artifact_helpers';
import { login, loginWithRole, ROLE } from '../tasks/login';

const runAction = (action: FormAction) => {
  let element;
  if (action.customSelector) {
    element = cy.get(action.customSelector);
  } else {
    element = cy.getBySel(action.selector || '');
  }

  if (action.type === 'click') {
    element.click();
  } else if (action.type === 'input') {
    element.type(action.value || '');
  } else if (action.type === 'clear') {
    element.clear();
  }
};

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

describe('Artifact tabs in Policy Details', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();
    removeAllArtifacts();
  });

  after(() => {
    removeAllArtifacts();
  });

  describe('Artifact tabs in Policy Details page', () => {
    describe(`Trusted Applications tab`, () => {
      it('[ALL] Given there are no artifacts, user can add an artifact', () => {
        visitArtifactTab('trustedApps');

        cy.getBySel('unexisting-manage-artifacts-button').should('exist').click();

        const { formActions, checkResults } = getArtifactsListTestsData()[0].create;

        for (const action of formActions) {
          runAction(action);
        }

        // Add a per policy artifact - but not assign it to any policy
        cy.getBySel('trustedApps-form-effectedPolicies-perPolicy').click();
        cy.getBySel('trustedAppsListPage-flyout-submitButton').click();

        // Check new artifact is in the list
        for (const checkResult of checkResults) {
          cy.getBySel(checkResult.selector).should('have.text', checkResult.value);
        }

        cy.getBySel('policyDetailsPage').should('not.exist');
        cy.getBySel('backToOrigin').contains(/^Back to .+ policy$/);

        cy.getBySel('backToOrigin').click();
        cy.getBySel('policyDetailsPage').should('exist');
      });

      it('[ALL] Given there are no assigned artifacts, user can Manage artifacts', () => {
        visitArtifactTab('trustedApps');
        cy.getBySel('unassigned-manage-artifacts-button').should('exist').click();
        cy.location('pathname').should('equal', '/app/security/administration/trusted_apps');
      });

      it('[ALL] Given there are no assigned artifacts, user can Assign an artifact', () => {
        visitArtifactTab('trustedApps');

        cy.getBySel('unassigned-assign-artifacts-button').should('exist').click();

        cy.getBySel('artifacts-assign-flyout').should('exist');
        cy.getBySel('artifacts-assign-confirm-button').should('be.disabled');

        cy.getBySel('Trusted application name_checkbox').click();
        cy.getBySel('artifacts-assign-confirm-button').click();
      });

      it('[ALL] Given there are assigned artifacts, user can see the artifacts and assign other artifacts', () => {
        visitArtifactTab('trustedApps');

        cy.getBySel('artifacts-collapsed-list-card').should('have.length', 1);
        cy.getBySel('artifacts-collapsed-list-card-header-titleHolder').contains(
          'Trusted application name'
        );
      });

      it('[ALL] Given there are assigned artifacts, user can assign other artifacts', () => {
        visitArtifactTab('trustedApps');

        cy.getBySel('artifacts-assign-button').should('exist').click();
        cy.getBySel('artifacts-assign-flyout').should('exist');
      });

      it('[ALL] Given there are assigned artifacts, user can unassign a "per policy" artifact from the policy', () => {
        visitArtifactTab('trustedApps');

        cy.getBySel('artifacts-collapsed-list-card-header-actions-button').click();
        cy.getBySel('remove-from-policy-action').click();
        cy.getBySel('confirmModalConfirmButton').click();

        cy.contains('Successfully removed');
      });
    });
  });
});
