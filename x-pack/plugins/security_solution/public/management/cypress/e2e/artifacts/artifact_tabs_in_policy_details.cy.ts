/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEndpointSecurityPolicyManager } from '../../../../../scripts/endpoint/common/roles_users';
import { getRoleWithArtifactReadPrivilege } from '../../fixtures/role_with_artifact_read_privilege';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { visitPolicyDetailsPage } from '../../screens/policy_details';
import {
  createArtifactList,
  createPerPolicyArtifact,
  removeAllArtifacts,
  removeExceptionsList,
  yieldFirstPolicyID,
} from '../../tasks/artifacts';
import { login, ROLE } from '../../tasks/login';
import { performUserActions } from '../../tasks/perform_user_actions';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../../types';

const loginWithPrivilegeAll = () => {
  login(ROLE.endpoint_policy_manager);
};

const loginWithPrivilegeRead = (privilegePrefix: string) => {
  const roleWithArtifactReadPrivilege = getRoleWithArtifactReadPrivilege(privilegePrefix);
  login.withCustomRole({ name: 'roleWithArtifactReadPrivilege', ...roleWithArtifactReadPrivilege });
};

const loginWithPrivilegeNone = (privilegePrefix: string) => {
  const roleWithoutArtifactPrivilege = getRoleWithoutArtifactPrivilege(privilegePrefix);
  login.withCustomRole({ name: 'roleWithoutArtifactPrivilege', ...roleWithoutArtifactPrivilege });
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
  clickArtifactTab(tabId);
};

const clickArtifactTab = (tabId: string) => {
  cy.get(`#${tabId}`).click();
};

describe(
  'Artifact tabs in Policy Details page',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;

    before(() => {
      indexEndpointHosts().then((indexEndpoints) => {
        endpointData = indexEndpoints;
      });
    });

    after(() => {
      removeAllArtifacts();

      endpointData?.cleanup();
      endpointData = undefined;
    });

    for (const testData of getArtifactsListTestsData()) {
      // FLAKY: https://github.com/elastic/kibana/issues/183670
      // FLAKY: https://github.com/elastic/kibana/issues/183671
      describe.skip(`${testData.title} tab`, () => {
        beforeEach(() => {
          login();
          removeExceptionsList(testData.createRequestBody.list_id);
        });

        it(
          `[NONE] User cannot see the tab for ${testData.title}`,
          // there is no such role in Serverless environment that can read policy but cannot read artifacts
          { tags: ['@skipInServerless'] },
          () => {
            loginWithPrivilegeNone(testData.privilegePrefix);
            visitPolicyDetailsPage();

            cy.get(`#${testData.tabId}`).should('not.exist');
          }
        );

        context(`Given there are no ${testData.title} entries`, () => {
          it(
            `[READ] User CANNOT add ${testData.title} artifact`,
            // there is no such role in Serverless environment that only reads artifacts
            { tags: ['@skipInServerless'] },
            () => {
              loginWithPrivilegeRead(testData.privilegePrefix);
              visitArtifactTab(testData.tabId);

              cy.getByTestSubj('policy-artifacts-empty-unexisting').should('exist');

              cy.getByTestSubj('unexisting-manage-artifacts-button').should('not.exist');
            }
          );

          it(`[ALL] User can add ${testData.title} artifact`, () => {
            loginWithPrivilegeAll();
            visitArtifactTab(testData.tabId);

            cy.getByTestSubj('policy-artifacts-empty-unexisting').should('exist');

            cy.getByTestSubj('unexisting-manage-artifacts-button').should('exist').click();

            const { formActions, checkResults } = testData.create;

            performUserActions(formActions);

            // Add a per policy artifact - but not assign it to any policy
            cy.get('[data-test-subj$="-perPolicy"]').click(); // test-subjects are generated in different formats, but all ends with -perPolicy
            cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

            // Check new artifact is in the list
            for (const checkResult of checkResults) {
              cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
            }

            cy.getByTestSubj('policyDetailsPage').should('not.exist');
            cy.getByTestSubj('backToOrigin').contains(/^Back to .+ policy$/);

            cy.getByTestSubj('backToOrigin').click();
            cy.getByTestSubj('policyDetailsPage').should('exist');
            clickArtifactTab(testData.nextTabId); // Make sure the next tab is accessible and backLink doesn't throw errors
            cy.getByTestSubj('policyDetailsPage');
          });
        });

        context(`Given there are no assigned ${testData.title} entries`, () => {
          beforeEach(() => {
            login();
            createArtifactList(testData.createRequestBody.list_id);
            createPerPolicyArtifact(testData.artifactName, testData.createRequestBody);
          });

          it(
            `[READ] User CANNOT Manage or Assign ${testData.title} artifacts`,
            // there is no such role in Serverless environment that only reads artifacts
            { tags: ['@skipInServerless'] },
            () => {
              loginWithPrivilegeRead(testData.privilegePrefix);
              visitArtifactTab(testData.tabId);

              cy.getByTestSubj('policy-artifacts-empty-unassigned').should('exist');

              cy.getByTestSubj('unassigned-manage-artifacts-button').should('not.exist');
              cy.getByTestSubj('unassigned-assign-artifacts-button').should('not.exist');
            }
          );

          it(`[ALL] User can Manage and Assign ${testData.title} artifacts`, () => {
            loginWithPrivilegeAll();
            visitArtifactTab(testData.tabId);

            cy.getByTestSubj('policy-artifacts-empty-unassigned').should('exist');

            // Manage artifacts
            cy.getByTestSubj('unassigned-manage-artifacts-button').should('exist').click();
            cy.location('pathname').should(
              'equal',
              `/app/security/administration/${testData.urlPath}`
            );
            cy.getByTestSubj('backToOrigin').click();

            // Assign artifacts
            cy.getByTestSubj('unassigned-assign-artifacts-button').should('exist').click();

            cy.getByTestSubj('artifacts-assign-flyout').should('exist');
            cy.getByTestSubj('artifacts-assign-confirm-button').should('be.disabled');

            cy.getByTestSubj(`${testData.artifactName}_checkbox`).click();
            cy.getByTestSubj('artifacts-assign-confirm-button').click();
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

          it(
            `[READ] User can see ${testData.title} artifacts but CANNOT assign or remove from policy`,
            // there is no such role in Serverless environment that only reads artifacts
            { tags: ['@skipInServerless'] },
            () => {
              loginWithPrivilegeRead(testData.privilegePrefix);
              visitArtifactTab(testData.tabId);

              // List of artifacts
              cy.getByTestSubj('artifacts-collapsed-list-card').should('have.length', 1);
              cy.getByTestSubj('artifacts-collapsed-list-card-header-titleHolder').contains(
                testData.artifactName
              );

              // Cannot assign artifacts
              cy.getByTestSubj('artifacts-assign-button').should('not.exist');

              // Cannot remove from policy
              cy.getByTestSubj('artifacts-collapsed-list-card-header-actions-button').click();
              cy.getByTestSubj('remove-from-policy-action').should('not.exist');
            }
          );

          it(`[ALL] User can see ${testData.title} artifacts and can assign or remove artifacts from policy`, () => {
            loginWithPrivilegeAll();
            visitArtifactTab(testData.tabId);

            // List of artifacts
            cy.getByTestSubj('artifacts-collapsed-list-card').should('have.length', 1);
            cy.getByTestSubj('artifacts-collapsed-list-card-header-titleHolder').contains(
              testData.artifactName
            );

            // Assign artifacts
            cy.getByTestSubj('artifacts-assign-button').should('exist').click();
            cy.getByTestSubj('artifacts-assign-flyout').should('exist');
            cy.getByTestSubj('artifacts-assign-cancel-button').click();

            // Remove from policy
            cy.getByTestSubj('artifacts-collapsed-list-card-header-actions-button').click();
            cy.getByTestSubj('remove-from-policy-action').click();
            cy.getByTestSubj('confirmModalConfirmButton').click();

            cy.contains('Successfully removed');
          });
        });
      });
    }
  }
);
