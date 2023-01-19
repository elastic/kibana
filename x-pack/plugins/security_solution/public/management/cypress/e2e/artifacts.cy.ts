/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginWithRole, ROLE } from '../tasks/login';

import { getArtifactsListTestsData } from '../fixtures/artifacts_page';
import {
  loadEndpointDataForEventFiltersIfNeeded,
  removeAllArtifacts,
} from '../tasks/artifact_helpers';
import { performUserActions } from '../tasks/perform_user_actions';

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.analyst_hunter);
  cy.visit(url);
};

const loginWithReadAccess = (url: string) => {
  loginWithRole(ROLE.t2_analyst);
  cy.visit(url);
};

const loginWithoutAccess = (url: string) => {
  loginWithRole(ROLE.t1_analyst);
  cy.visit(url);
};

describe('Artifacts pages', () => {
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

  for (const testData of getArtifactsListTestsData()) {
    describe(`When on the ${testData.title} entries list`, () => {
      it(`no access - should show no privileges callout`, () => {
        loginWithoutAccess(`/app/security/administration/${testData.urlPath}`);
        cy.getBySel('noPrivilegesPage').should('exist');
        cy.getBySel('empty-page-feature-action').should('exist');
        cy.getBySel(testData.emptyState).should('not.exist');
        cy.getBySel(`${testData.pagePrefix}-emptyState-addButton`).should('not.exist');
      });

      it(`read - should show empty state page if there is no ${testData.title} entry and the add button does not exist`, () => {
        loginWithReadAccess(`/app/security/administration/${testData.urlPath}`);
        cy.getBySel(testData.emptyState).should('exist');
        cy.getBySel(`${testData.pagePrefix}-emptyState-addButton`).should('not.exist');
      });

      it(`write - should show empty state page if there is no ${testData.title} entry and the add button exists`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        cy.getBySel(testData.emptyState).should('exist');
        cy.getBySel(`${testData.pagePrefix}-emptyState-addButton`).should('exist');
      });

      it(`write - should create new ${testData.title} entry`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        // Opens add flyout
        cy.getBySel(`${testData.pagePrefix}-emptyState-addButton`).click();

        performUserActions(testData.create.formActions);

        // Submit create artifact form
        cy.getBySel(`${testData.pagePrefix}-flyout-submitButton`).click();

        // Check new artifact is in the list
        for (const checkResult of testData.create.checkResults) {
          cy.getBySel(checkResult.selector).should('have.text', checkResult.value);
        }

        // Title is shown after adding an item
        cy.getBySel('header-page-title').contains(testData.title);
      });

      it(`read - should not be able to update/delete an existing ${testData.title} entry`, () => {
        loginWithReadAccess(`/app/security/administration/${testData.urlPath}`);
        cy.getBySel('header-page-title').contains(testData.title);
        cy.getBySel(`${testData.pagePrefix}-card-header-actions-button`).should('not.exist');
        cy.getBySel(`${testData.pagePrefix}-card-cardEditAction`).should('not.exist');
        cy.getBySel(`${testData.pagePrefix}-card-cardDeleteAction`).should('not.exist');
      });

      it(`read - should not be able to create a new ${testData.title} entry`, () => {
        loginWithReadAccess(`/app/security/administration/${testData.urlPath}`);
        cy.getBySel('header-page-title').contains(testData.title);
        cy.getBySel(`${testData.pagePrefix}-pageAddButton`).should('not.exist');
      });

      it(`write - should be able to update an existing ${testData.title} entry`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        // Opens edit flyout
        cy.getBySel(`${testData.pagePrefix}-card-header-actions-button`).click();
        cy.getBySel(`${testData.pagePrefix}-card-cardEditAction`).click();

        performUserActions(testData.update.formActions);

        // Submit edit artifact form
        cy.getBySel(`${testData.pagePrefix}-flyout-submitButton`).click();

        for (const checkResult of testData.create.checkResults) {
          cy.getBySel(checkResult.selector).should('have.text', checkResult.value);
        }

        // Title still shown after editing an item
        cy.getBySel('header-page-title').contains(testData.title);
      });

      it(`write - should be able to delete the existing ${testData.title} entry`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        // Remove it
        cy.getBySel(`${testData.pagePrefix}-card-header-actions-button`).click();
        cy.getBySel(`${testData.pagePrefix}-card-cardDeleteAction`).click();
        cy.getBySel(`${testData.pagePrefix}-deleteModal-submitButton`).click();
        // No card visible after removing it
        cy.getBySel(testData.delete.card).should('not.exist');
        // Empty state is displayed after removing last item
        cy.getBySel(testData.emptyState).should('exist');
      });
    });
  }
});
