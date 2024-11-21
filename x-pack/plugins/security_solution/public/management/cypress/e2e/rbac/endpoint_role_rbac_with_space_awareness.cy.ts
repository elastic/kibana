/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, ROLE } from '../../tasks/login';
import { createSpace, deleteSpace } from '../../tasks/spaces';
import {
  clickEndpointSubFeaturePrivilegesCustomization,
  clickFlyoutAddKibanaPrivilegeButton,
  clickRoleSaveButton,
  clickViewPrivilegeSummaryButton,
  ENDPOINT_SUB_FEATURE_PRIVILEGE_IDS,
  expandEndpointSecurityFeaturePrivileges,
  expandSecuritySolutionCategoryKibanaPrivileges,
  navigateToRolePage,
  openKibanaFeaturePrivilegesFlyout,
  setEndpointSubFeaturePrivilege,
  setKibanaPrivilegeSpace,
  setRoleName,
  setSecuritySolutionEndpointGroupPrivilege,
} from '../../screens/stack_management/role_page';

// Failing: See https://github.com/elastic/kibana/issues/200962
describe.skip(
  'When defining a kibana role for Endpoint security access with space awareness enabled',
  {
    // TODO:PR Remove `'@skipInServerlessMKI` once PR merges to `main`
    tags: ['@ess', '@serverless', '@serverlessMKI', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'endpointManagementSpaceAwarenessEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    let spaceId: string = '';
    const roleName = `test_${Math.random().toString().substring(2, 6)}`;

    before(() => {
      login(ROLE.system_indices_superuser);
      createSpace(`foo_${Math.random().toString().substring(2, 6)}`).then((response) => {
        spaceId = response.body.id;
      });
    });

    after(() => {
      if (spaceId) {
        deleteSpace(spaceId);
        spaceId = '';
      }
    });

    beforeEach(() => {
      login(ROLE.system_indices_superuser);
      navigateToRolePage();
      setRoleName(roleName);
      openKibanaFeaturePrivilegesFlyout();
      expandSecuritySolutionCategoryKibanaPrivileges();
      expandEndpointSecurityFeaturePrivileges();
    });

    it('should allow configuration per-space', () => {
      setKibanaPrivilegeSpace(spaceId);
      setSecuritySolutionEndpointGroupPrivilege('all');
      clickEndpointSubFeaturePrivilegesCustomization();
      setEndpointSubFeaturePrivilege('endpoint_list', 'all');
      setEndpointSubFeaturePrivilege('host_isolation', 'all');
      clickFlyoutAddKibanaPrivilegeButton();
      clickRoleSaveButton();

      navigateToRolePage(roleName);
      clickViewPrivilegeSummaryButton();
      cy.getByTestSubj('expandPrivilegeSummaryRow').click({ multiple: true });

      cy.getByTestSubj('privilegeSummaryFeatureCategory_securitySolution')
        .findByTestSubj(`space-avatar-${spaceId}`)
        .should('exist');

      cy.get('#row_siem_expansion')
        .findByTestSubj('subFeatureEntry')
        .then(($element) => {
          const features: string[] = [];

          $element.each((_, $subFeature) => {
            features.push($subFeature.textContent ?? '');
          });

          return features;
        })
        // Using `include.members` here because in serverless, an additional privilege shows
        // up in this list - `Endpoint exceptions`.
        .should('include.members', [
          'Endpoint ListAll',
          'Trusted ApplicationsNone',
          'Host Isolation ExceptionsNone',
          'BlocklistNone',
          'Event FiltersNone',
          'Elastic Defend Policy ManagementNone',
          'Response Actions HistoryNone',
          'Host IsolationAll',
          'Process OperationsNone',
          'File OperationsNone',
          'Execute OperationsNone',
          'Scan OperationsNone',
        ]);
    });

    it('should not display the privilege tooltip', () => {
      ENDPOINT_SUB_FEATURE_PRIVILEGE_IDS.forEach((subFeaturePrivilegeId) => {
        cy.getByTestSubj(`securitySolution_siem_${subFeaturePrivilegeId}_nameTooltip`).should(
          'not.exist'
        );
      });
    });
  }
);
