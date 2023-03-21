/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRoleWithArtifactReadPrivilege,
  login,
  loginWithCustomRole,
  loginWithRole,
  ROLE,
} from '../../tasks/login';

import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { removeAllArtifacts } from '../../tasks/artifacts';
import { performUserActions } from '../../tasks/perform_user_actions';
import { loadEndpointDataForEventFiltersIfNeeded } from '../../tasks/load_endpoint_data';

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.endpoint_security_policy_manager);
  cy.visit(url);
};

const loginWithReadAccess = (privilegePrefix: string, url: string) => {
  const roleWithArtifactReadPrivilege = getRoleWithArtifactReadPrivilege(privilegePrefix);
  loginWithCustomRole('roleWithArtifactReadPrivilege', roleWithArtifactReadPrivilege);
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
        cy.getByTestSubj('noPrivilegesPage').should('exist');
        cy.getByTestSubj('empty-page-feature-action').should('exist');
        cy.getByTestSubj(testData.emptyState).should('not.exist');
        cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).should('not.exist');
      });

      it(`read - should show empty state page if there is no ${testData.title} entry and the add button does not exist`, () => {
        loginWithReadAccess(
          testData.privilegePrefix,
          `/app/security/administration/${testData.urlPath}`
        );
        cy.getByTestSubj(testData.emptyState).should('exist');
        cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).should('not.exist');
      });

      it(`write - should show empty state page if there is no ${testData.title} entry and the add button exists`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        cy.getByTestSubj(testData.emptyState).should('exist');
        cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).should('exist');
      });

      it(`write - should create new ${testData.title} entry`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        // Opens add flyout
        cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).click();

        performUserActions(testData.create.formActions);

        // Submit create artifact form
        cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

        // Check new artifact is in the list
        for (const checkResult of testData.create.checkResults) {
          cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
        }

        // Title is shown after adding an item
        cy.getByTestSubj('header-page-title').contains(testData.title);
      });

      it(`read - should not be able to update/delete an existing ${testData.title} entry`, () => {
        loginWithReadAccess(
          testData.privilegePrefix,
          `/app/security/administration/${testData.urlPath}`
        );
        cy.getByTestSubj('header-page-title').contains(testData.title);
        cy.getByTestSubj(`${testData.pagePrefix}-card-header-actions-button`).should('not.exist');
        cy.getByTestSubj(`${testData.pagePrefix}-card-cardEditAction`).should('not.exist');
        cy.getByTestSubj(`${testData.pagePrefix}-card-cardDeleteAction`).should('not.exist');
      });

      it(`read - should not be able to create a new ${testData.title} entry`, () => {
        loginWithReadAccess(
          testData.privilegePrefix,
          `/app/security/administration/${testData.urlPath}`
        );
        cy.getByTestSubj('header-page-title').contains(testData.title);
        cy.getByTestSubj(`${testData.pagePrefix}-pageAddButton`).should('not.exist');
      });

      it(`write - should be able to update an existing ${testData.title} entry`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        // Opens edit flyout
        cy.getByTestSubj(`${testData.pagePrefix}-card-header-actions-button`).click();
        cy.getByTestSubj(`${testData.pagePrefix}-card-cardEditAction`).click();

        performUserActions(testData.update.formActions);

        // Submit edit artifact form
        cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

        for (const checkResult of testData.create.checkResults) {
          cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
        }

        // Title still shown after editing an item
        cy.getByTestSubj('header-page-title').contains(testData.title);
      });

      it(`write - should be able to delete the existing ${testData.title} entry`, () => {
        loginWithWriteAccess(`/app/security/administration/${testData.urlPath}`);
        // Remove it
        cy.getByTestSubj(`${testData.pagePrefix}-card-header-actions-button`).click();
        cy.getByTestSubj(`${testData.pagePrefix}-card-cardDeleteAction`).click();
        cy.getByTestSubj(`${testData.pagePrefix}-deleteModal-submitButton`).click();
        // No card visible after removing it
        cy.getByTestSubj(testData.delete.card).should('not.exist');
        // Empty state is displayed after removing last item
        cy.getByTestSubj(testData.emptyState).should('exist');
      });
    });
  }
});
