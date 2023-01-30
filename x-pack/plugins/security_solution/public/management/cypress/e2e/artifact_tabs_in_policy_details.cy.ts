/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEndpointSecurityPolicyManager } from '../../../../scripts/endpoint/common/roles_users/endpoint_security_policy_manager';
import { getArtifactsListTestsData } from '../fixtures/artifacts_page';
import {
  createPerPolicyArtifact,
  createArtifactList,
  removeAllArtifacts,
  removeArtifactsFromLists,
  yieldFirstPolicyID,
} from '../tasks/artifacts';
import { loadEndpointDataForEventFiltersIfNeeded } from '../tasks/load_endpoint_data';
import { login, loginWithCustomRole, loginWithRole, ROLE } from '../tasks/login';
import { performUserActions } from '../tasks/perform_user_actions';

const loginWithPrivilegeAll = () => {
  loginWithRole(ROLE.endpoint_security_policy_manager);
};

const loginWithPrivilegeRead = (privilegePrefix: string) => {
  const roleWithArtifactReadPrivilege = getRoleWithArtifactReadPrivilege(privilegePrefix);
  loginWithCustomRole('roleWithArtifactReadPrivilege', roleWithArtifactReadPrivilege);
};

const loginWithPrivilegeNone = (privilegePrefix: string) => {
  const roleWithoutArtifactPrivilege = getRoleWithoutArtifactPrivilege(privilegePrefix);
  loginWithCustomRole('roleWithoutArtifactPrivilege', roleWithoutArtifactPrivilege);
};

const getRoleWithArtifactReadPrivilege = (privilegePrefix: string) => {
  const endpointSecurityPolicyManagerRole = getEndpointSecurityPolicyManager();

  return {
    ...endpointSecurityPolicyManagerRole,
    kibana: [
      {
        ...endpointSecurityPolicyManagerRole.kibana[0],
        feature: {
          ...endpointSecurityPolicyManagerRole.kibana[0].feature,
          siem: [
            ...endpointSecurityPolicyManagerRole.kibana[0].feature.siem.filter(
              (privilege) => privilege !== `${privilegePrefix}all`
            ),
            `${privilegePrefix}read`,
          ],
        },
      },
    ],
  };
};

const getRoleWithoutArtifactPrivilege = (privilegePrefix: string) => {
  const endpointSecurityPolicyManagerRole = getEndpointSecurityPolicyManager();

  return {
    ...endpointSecurityPolicyManagerRole,
    kibana: [
      {
        ...endpointSecurityPolicyManagerRole.kibana[0],
        feature: {
          ...endpointSecurityPolicyManagerRole.kibana[0].feature,
          siem: endpointSecurityPolicyManagerRole.kibana[0].feature.siem.filter(
            (privilege) => privilege !== `${privilegePrefix}all`
          ),
        },
      },
    ],
  };
};

const visitArtifactTab = (tabId: string) => {
  visitPolicyDetailsPage();
  cy.get(`#${tabId}`).click();
};

const visitPolicyDetailsPage = () => {
  cy.visit('/app/security/administration/policy');
  cy.getBySel('policyNameCellLink').eq(0).click({ force: true });
  cy.getBySel('policyDetailsPage').should('exist');
  cy.get('#settings').should('exist'); // waiting for Policy Settings tab
};

describe('Artifact tabs in Policy Details page', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();
  });

  after(() => {
    login();
    removeAllArtifacts();
  });

  for (const testData of getArtifactsListTestsData()) {
    beforeEach(() => {
      login();
      removeArtifactsFromLists(testData.createRequestBody.list_id);
    });

    describe(`${testData.title} tab`, () => {
      it(`[NONE] User cannot see the tab for ${testData.title}`, () => {
        loginWithPrivilegeNone(testData.privilegePrefix);
        visitPolicyDetailsPage();

        cy.get(`#${testData.tabId}`).should('not.exist');
      });

      context(`Given there are no ${testData.title} entries`, () => {
        it(`[READ] User CANNOT add ${testData.title} artifact`, () => {
          loginWithPrivilegeRead(testData.privilegePrefix);
          visitArtifactTab(testData.tabId);

          cy.getBySel('policy-artifacts-empty-unexisting').should('exist');

          cy.getBySel('unexisting-manage-artifacts-button').should('not.exist');
        });

        it(`[ALL] User can add ${testData.title} artifact`, () => {
          loginWithPrivilegeAll();
          visitArtifactTab(testData.tabId);

          cy.getBySel('policy-artifacts-empty-unexisting').should('exist');

          cy.getBySel('unexisting-manage-artifacts-button').should('exist').click();

          const { formActions, checkResults } = testData.create;

          performUserActions(formActions);

          // Add a per policy artifact - but not assign it to any policy
          cy.get('[data-test-subj$="-perPolicy"]').click(); // test-subjects are generated in different formats, but all ends with -perPolicy
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
      });

      context(`Given there are no assigned ${testData.title} entries`, () => {
        beforeEach(() => {
          login();
          createArtifactList(testData.createRequestBody.list_id);
          createPerPolicyArtifact(testData.artifactName, testData.createRequestBody);
        });

        it(`[READ] User CANNOT Manage or Assign ${testData.title} artifacts`, () => {
          loginWithPrivilegeRead(testData.privilegePrefix);
          visitArtifactTab(testData.tabId);

          cy.getBySel('policy-artifacts-empty-unassigned').should('exist');

          cy.getBySel('unassigned-manage-artifacts-button').should('not.exist');
          cy.getBySel('unassigned-assign-artifacts-button').should('not.exist');
        });

        it(`[ALL] User can Manage and Assign ${testData.title} artifacts`, () => {
          loginWithPrivilegeAll();
          visitArtifactTab(testData.tabId);

          cy.getBySel('policy-artifacts-empty-unassigned').should('exist');

          // Manage artifacts
          cy.getBySel('unassigned-manage-artifacts-button').should('exist').click();
          cy.location('pathname').should(
            'equal',
            `/app/security/administration/${testData.urlPath}`
          );
          cy.getBySel('backToOrigin').click();

          // Assign artifacts
          cy.getBySel('unassigned-assign-artifacts-button').should('exist').click();

          cy.getBySel('artifacts-assign-flyout').should('exist');
          cy.getBySel('artifacts-assign-confirm-button').should('be.disabled');

          cy.getBySel(`${testData.artifactName}_checkbox`).click();
          cy.getBySel('artifacts-assign-confirm-button').click();
        });
      });

      context(`Given there are assigned ${testData.title} entries`, () => {
        beforeEach(() => {
          login();
          createArtifactList(testData.createRequestBody.list_id);
          yieldFirstPolicyID().then((policyID) => {
            createPerPolicyArtifact(testData.artifactName, testData.createRequestBody, policyID);
          });
        });

        it(`[READ] User can see ${testData.title} artifacts but CANNOT assign or remove from policy`, () => {
          loginWithPrivilegeRead(testData.privilegePrefix);
          visitArtifactTab(testData.tabId);

          // List of artifacts
          cy.getBySel('artifacts-collapsed-list-card').should('have.length', 1);
          cy.getBySel('artifacts-collapsed-list-card-header-titleHolder').contains(
            testData.artifactName
          );

          // Cannot assign artifacts
          cy.getBySel('artifacts-assign-button').should('not.exist');

          // Cannot remove from policy
          cy.getBySel('artifacts-collapsed-list-card-header-actions-button').click();
          cy.getBySel('remove-from-policy-action').should('not.exist');
        });

        it(`[ALL] User can see ${testData.title} artifacts and can assign or remove artifacts from policy`, () => {
          loginWithPrivilegeAll();
          visitArtifactTab(testData.tabId);

          // List of artifacts
          cy.getBySel('artifacts-collapsed-list-card').should('have.length', 1);
          cy.getBySel('artifacts-collapsed-list-card-header-titleHolder').contains(
            testData.artifactName
          );

          // Assign artifacts
          cy.getBySel('artifacts-assign-button').should('exist').click();
          cy.getBySel('artifacts-assign-flyout').should('exist');
          cy.getBySel('artifacts-assign-cancel-button').click();

          // Remove from policy
          cy.getBySel('artifacts-collapsed-list-card-header-actions-button').click();
          cy.getBySel('remove-from-policy-action').click();
          cy.getBySel('confirmModalConfirmButton').click();

          cy.contains('Successfully removed');
        });
      });
    });
  }
});
