/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from '../tasks/toasts';
import { login, ROLE } from '../tasks/login';
import { loadPage } from '../tasks/common';

describe(
  'When defining a kibana role for Endpoint security access',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'responseActionScanEnabled',
          ])}`,
        ],
      },
    },
    tags: '@ess',
  },
  () => {
    const getAllSubFeatureRows = (): Cypress.Chainable<JQuery<HTMLElement>> => {
      return cy
        .get('#featurePrivilegeControls_siem')
        .findByTestSubj('mutexSubFeaturePrivilegeControl')
        .closest('.euiFlexGroup');
    };

    beforeEach(() => {
      login(ROLE.system_indices_superuser);
      loadPage('/app/management/security/roles/edit');
      closeAllToasts();
      cy.getByTestSubj('addSpacePrivilegeButton').click();
      cy.getByTestSubj('featureCategoryButton_securitySolution').closest('button').click();
      cy.get('.featurePrivilegeName:contains("Security")').closest('button').click();
    });

    it('should display RBAC entries with expected controls', () => {
      getAllSubFeatureRows()
        .then(($subFeatures) => {
          const featureRows: string[] = [];
          $subFeatures.each((_, $subFeature) => {
            featureRows.push($subFeature.textContent ?? '');
          });

          return featureRows;
        })
        .should('deep.equal', [
          'Endpoint List Displays all hosts running Elastic Defend and their relevant integration details.Endpoint List sub-feature privilegeAllReadNone',
          'Trusted Applications Helps mitigate conflicts with other software, usually other antivirus or endpoint security applications.Trusted Applications sub-feature privilegeAllReadNone',
          'Host Isolation Exceptions Add specific IP addresses that isolated hosts are still allowed to communicate with, even when isolated from the rest of the network.Host Isolation Exceptions sub-feature privilegeAllReadNone',
          'Blocklist Extend Elastic Defend’s protection against malicious processes and protect against potentially harmful applications.Blocklist sub-feature privilegeAllReadNone',
          'Event Filters Filter out endpoint events that you do not need or want stored in Elasticsearch.Event Filters sub-feature privilegeAllReadNone',
          'Elastic Defend Policy Management Access the Elastic Defend integration policy to configure protections, event collection, and advanced policy features.Elastic Defend Policy Management sub-feature privilegeAllReadNone',
          'Response Actions History Access the history of response actions performed on endpoints.Response Actions History sub-feature privilegeAllReadNone',
          'Host Isolation Perform the "isolate" and "release" response actions.Host Isolation sub-feature privilegeAllNone',
          'Process Operations Perform process-related response actions in the response console.Process Operations sub-feature privilegeAllNone',
          'File Operations Perform file-related response actions in the response console.File Operations sub-feature privilegeAllNone',
          'Execute Operations Perform script execution response actions in the response console.Execute Operations sub-feature privilegeAllNone',
          'Scan Operations Perform folder scan response actions in the response console.Scan Operations sub-feature privilegeAllNone',
        ]);
    });
  }
);
