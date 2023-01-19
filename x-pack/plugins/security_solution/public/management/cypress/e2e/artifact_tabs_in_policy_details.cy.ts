/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { isEmpty } from 'lodash';
import { BASE_ENDPOINT_ROUTE } from '../../../../common/endpoint/constants';
import type { FormAction } from '../fixtures/artifacts_page';
import { getArtifactsListTestsData } from '../fixtures/artifacts_page';
import { login, loginWithRole, ROLE } from '../tasks/login';
import { runEndpointLoaderScript } from '../tasks/run_endpoint_loader';

const removeAllArtifacts = () => {
  for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
    cy.request({
      method: 'DELETE',
      url: `${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`,
      headers: { 'kbn-xsrf': 'kibana' },
      failOnStatusCode: false,
    });
  }
};

// Checks for Endpoint data and creates it if needed
const loadEndpointDataForEventFiltersIfNeeded = () => {
  cy.request({
    method: 'POST',
    url: `${BASE_ENDPOINT_ROUTE}/suggestions/eventFilters`,
    body: {
      field: 'agent.type',
      query: '',
    },
    headers: { 'kbn-xsrf': 'kibana' },
    failOnStatusCode: false,
  }).then(({ body }) => {
    if (isEmpty(body)) {
      runEndpointLoaderScript();
    }
  });
};

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
    // Clean artifacts data
    removeAllArtifacts();
  });

  after(() => {
    // Clean artifacts data
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
