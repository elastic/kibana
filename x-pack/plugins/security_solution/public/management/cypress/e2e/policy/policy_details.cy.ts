/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import {
  setCustomProtectionUpdatesManifestVersion,
  setCustomProtectionUpdatesNote,
} from '../../tasks/endpoint_policy';
import { login, ROLE } from '../../tasks/login';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';

describe(
  'Policy Details',
  {
    tags: [
      '@ess',
      '@serverless',
      // Not supported in serverless!
      // The `disableExpandableFlyoutAdvancedSettings()` fails because the API
      // `internal/kibana/settings` is not accessible in serverless
      '@brokenInServerless',
    ],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'sentinelOneManualHostActionsEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    describe('Protection updates', () => {
      const loadProtectionUpdatesUrl = (policyId: string) =>
        loadPage(`/app/security/administration/policy/${policyId}/protectionUpdates`);
      const testNote = 'test note';
      const updatedTestNote = 'updated test note';

      describe('Renders and saves protection updates', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;
        let policy: PolicyData;
        const defaultDate = moment.utc().subtract(1, 'days');
        const formattedDefaultDate = defaultDate.format('MMMM DD, YYYY');

        beforeEach(() => {
          login();
          disableExpandableFlyoutAdvancedSettings();
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
              policy = indexedPolicy.integrationPolicies[0];
            });
          });
        });

        afterEach(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });

        it('should render the protection updates tab content', () => {
          loadProtectionUpdatesUrl(policy.id);
          cy.getByTestSubj('protection-updates-warning-callout');
          cy.getByTestSubj('protection-updates-automatic-updates-enabled');
          cy.getByTestSubj('protection-updates-manifest-switch');
          cy.getByTestSubj('protection-updates-manifest-name-title');
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');

          cy.getByTestSubj('protection-updates-manifest-switch').click();

          cy.getByTestSubj('protection-updates-manifest-name-deployed-version-title');
          cy.getByTestSubj('protection-updates-deployed-version').contains('latest');
          cy.getByTestSubj('protection-updates-manifest-name-version-to-deploy-title');
          cy.getByTestSubj('protection-updates-version-to-deploy-picker').within(() => {
            cy.get('input').should('have.value', formattedDefaultDate);
          });
          cy.getByTestSubj('protection-updates-manifest-name-note-title');
          cy.getByTestSubj('protection-updates-manifest-note');
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.enabled');
        });

        it('should display warning modal when user has unsaved changes', () => {
          loadProtectionUpdatesUrl(policy.id);
          cy.getByTestSubj('protection-updates-manifest-switch').click();
          cy.getByTestSubj('policySettingsTab').click();
          cy.getByTestSubj('policyDetailsUnsavedChangesModal').within(() => {
            cy.getByTestSubj('confirmModalCancelButton').click();
          });
          cy.url().should('include', 'protectionUpdates');
          cy.getByTestSubj('policySettingsTab').click();
          cy.getByTestSubj('policyDetailsUnsavedChangesModal').within(() => {
            cy.getByTestSubj('confirmModalConfirmButton').click();
          });
          cy.url().should('include', 'settings');
        });

        it('should successfully update the manifest version to custom date', () => {
          loadProtectionUpdatesUrl(policy.id);
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');
          cy.getByTestSubj('protection-updates-manifest-switch').click();
          cy.getByTestSubj('protection-updates-manifest-note').type(testNote);

          cy.intercept('PUT', `/api/fleet/package_policies/${policy.id}`).as('policy');
          cy.intercept('POST', `/api/endpoint/protection_updates_note/${policy.id}`).as('note');
          cy.getByTestSubj('protectionUpdatesSaveButton').click();
          cy.wait('@policy').then(({ request, response }) => {
            expect(request.body.inputs[0].config.policy.value.global_manifest_version).to.equal(
              defaultDate.format('YYYY-MM-DD')
            );
            expect(response?.statusCode).to.equal(200);
          });

          cy.wait('@note').then(({ request, response }) => {
            expect(request.body.note).to.equal(testNote);
            expect(response?.statusCode).to.equal(200);
          });

          cy.getByTestSubj('protectionUpdatesSuccessfulMessage');
          cy.getByTestSubj('protection-updates-deployed-version').contains(formattedDefaultDate);
          cy.getByTestSubj('protection-updates-manifest-note').contains(testNote);
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');
        });
      });

      describe('Renders and saves protection updates with custom version', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;
        let policy: PolicyData;

        const oneWeekAgo = moment.utc().subtract(1, 'weeks').format('YYYY-MM-DD');

        beforeEach(() => {
          login();
          disableExpandableFlyoutAdvancedSettings();
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
              policy = indexedPolicy.integrationPolicies[0];
              setCustomProtectionUpdatesManifestVersion(policy.id, oneWeekAgo);
            });
          });
        });

        afterEach(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });

        it('should update manifest version to latest when enabling automatic updates', () => {
          loadProtectionUpdatesUrl(policy.id);
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');

          cy.getByTestSubj('protection-updates-manifest-switch').click();
          cy.intercept('PUT', `/api/fleet/package_policies/${policy.id}`).as('policy_latest');

          cy.getByTestSubj('protectionUpdatesSaveButton').click();

          cy.wait('@policy_latest').then(({ request, response }) => {
            expect(request.body.inputs[0].config.policy.value.global_manifest_version).to.equal(
              'latest'
            );
            expect(response?.statusCode).to.equal(200);
          });
          cy.getByTestSubj('protectionUpdatesSuccessfulMessage');
          cy.getByTestSubj('protection-updates-automatic-updates-enabled');
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');
        });
      });

      describe('Renders and saves protection updates with custom note', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;
        let policy: PolicyData;

        const oneWeekAgo = moment.utc().subtract(1, 'weeks').format('YYYY-MM-DD');

        beforeEach(() => {
          login();
          disableExpandableFlyoutAdvancedSettings();
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
              policy = indexedPolicy.integrationPolicies[0];
              setCustomProtectionUpdatesManifestVersion(policy.id, oneWeekAgo);
              setCustomProtectionUpdatesNote(policy.id, testNote);
            });
          });
        });

        afterEach(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });

        it('should update note on save', () => {
          loadProtectionUpdatesUrl(policy.id);
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');

          cy.getByTestSubj('protection-updates-manifest-note').contains(testNote);
          cy.getByTestSubj('protection-updates-manifest-note').clear();
          cy.getByTestSubj('protection-updates-manifest-note').type(updatedTestNote);

          cy.intercept('POST', `/api/endpoint/protection_updates_note/${policy.id}`).as(
            'note_updated'
          );
          cy.getByTestSubj('protectionUpdatesSaveButton').click();
          cy.wait('@note_updated').then(({ request, response }) => {
            expect(request.body.note).to.equal(updatedTestNote);
            expect(response?.statusCode).to.equal(200);
          });
          cy.getByTestSubj('protectionUpdatesSuccessfulMessage');
          cy.getByTestSubj('protection-updates-manifest-note').contains(updatedTestNote);
          cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');

          loadProtectionUpdatesUrl(policy.id);
          cy.getByTestSubj('protection-updates-manifest-note').contains(updatedTestNote);
        });
      });

      describe('Renders read only protection updates for user without write permissions', () => {
        describe('With note field', () => {
          let indexedPolicy: IndexedFleetEndpointPolicyResponse;
          let policy: PolicyData;
          const oneWeekAgo = moment.utc().subtract(1, 'weeks');

          beforeEach(() => {
            login(ROLE.t3_analyst);
            disableExpandableFlyoutAdvancedSettings();
            getEndpointIntegrationVersion().then((version) => {
              createAgentPolicyTask(version).then((data) => {
                indexedPolicy = data;
                policy = indexedPolicy.integrationPolicies[0];
                setCustomProtectionUpdatesManifestVersion(
                  policy.id,
                  oneWeekAgo.format('YYYY-MM-DD')
                );
                setCustomProtectionUpdatesNote(policy.id, testNote);
              });
            });
          });

          afterEach(() => {
            if (indexedPolicy) {
              cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
            }
          });

          it('should render the protection updates tab content', () => {
            loadProtectionUpdatesUrl(policy.id);
            cy.getByTestSubj('protection-updates-manifest-switch').should('not.exist');
            cy.getByTestSubj('protection-updates-state-view-mode');
            cy.getByTestSubj('protection-updates-manifest-name-title');

            cy.getByTestSubj('protection-updates-manifest-name-deployed-version-title');
            cy.getByTestSubj('protection-updates-deployed-version').contains(
              oneWeekAgo.format('MMMM DD, YYYY')
            );
            cy.getByTestSubj('protection-updates-manifest-name-version-to-deploy-title');
            cy.getByTestSubj('protection-updates-version-to-deploy-view-mode');
            cy.getByTestSubj('protection-updates-version-to-deploy-picker').should('not.exist');

            cy.getByTestSubj('protection-updates-manifest-name-note-title');
            cy.getByTestSubj('protection-updates-manifest-note').should('not.exist');
            cy.getByTestSubj('protection-updates-manifest-note-view-mode').contains(testNote);
            cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');
          });
        });

        describe('Without note field', () => {
          let indexedPolicy: IndexedFleetEndpointPolicyResponse;
          let policy: PolicyData;
          const oneWeekAgo = moment.utc().subtract(1, 'weeks');

          beforeEach(() => {
            login(ROLE.t3_analyst);
            disableExpandableFlyoutAdvancedSettings();
            getEndpointIntegrationVersion().then((version) => {
              createAgentPolicyTask(version).then((data) => {
                indexedPolicy = data;
                policy = indexedPolicy.integrationPolicies[0];
                setCustomProtectionUpdatesManifestVersion(
                  policy.id,
                  oneWeekAgo.format('YYYY-MM-DD')
                );
              });
            });
          });

          afterEach(() => {
            if (indexedPolicy) {
              cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
            }
          });

          it('should render the protection updates tab content', () => {
            loadProtectionUpdatesUrl(policy.id);
            cy.getByTestSubj('protection-updates-manifest-switch').should('not.exist');
            cy.getByTestSubj('protection-updates-state-view-mode');
            cy.getByTestSubj('protection-updates-manifest-name-title');

            cy.getByTestSubj('protection-updates-manifest-name-deployed-version-title');
            cy.getByTestSubj('protection-updates-deployed-version').contains(
              oneWeekAgo.format('MMMM DD, YYYY')
            );
            cy.getByTestSubj('protection-updates-manifest-name-version-to-deploy-title');
            cy.getByTestSubj('protection-updates-version-to-deploy-view-mode');
            cy.getByTestSubj('protection-updates-version-to-deploy-picker').should('not.exist');

            cy.getByTestSubj('protection-updates-manifest-name-note-title').should('not.exist');
            cy.getByTestSubj('protection-updates-manifest-note').should('not.exist');
            cy.getByTestSubj('protection-updates-manifest-note-view-mode').should('not.exist');
            cy.getByTestSubj('protectionUpdatesSaveButton').should('be.disabled');
          });
        });
      });
    });
    describe('Policy settings', () => {
      const loadSettingsUrl = (policyId: string) =>
        loadPage(`/app/security/administration/policy/${policyId}/settings`);

      describe('Renders policy settings form', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;
        let policy: PolicyData;

        beforeEach(() => {
          login();
          disableExpandableFlyoutAdvancedSettings();
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
              policy = indexedPolicy.integrationPolicies[0];
            });
          });
        });

        afterEach(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });
        it('should render disabled button and display modal if unsaved changes are present', () => {
          loadSettingsUrl(policy.id);
          cy.getByTestSubj('policyDetailsSaveButton').should('be.disabled');
          cy.getByTestSubj('endpointPolicyForm-malware-enableDisableSwitch').click();
          cy.getByTestSubj('policyDetailsSaveButton').should('not.be.disabled');
          cy.getByTestSubj('policyProtectionUpdatesTab').click();
          cy.getByTestSubj('policyDetailsUnsavedChangesModal').within(() => {
            cy.getByTestSubj('confirmModalCancelButton').click();
          });
          cy.url().should('include', 'settings');
          cy.getByTestSubj('policyProtectionUpdatesTab').click();

          cy.getByTestSubj('policyDetailsUnsavedChangesModal').within(() => {
            cy.getByTestSubj('confirmModalConfirmButton').click();
          });
          cy.url().should('include', 'protectionUpdates');
        });
      });
    });
  }
);
