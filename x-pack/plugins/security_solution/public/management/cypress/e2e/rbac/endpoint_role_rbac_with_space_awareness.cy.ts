/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from '../../tasks/toasts';
import { login, ROLE } from '../../tasks/login';
import { createSpace, deleteSpace } from '../../tasks/spaces';
import {
  clickEndpointSubFeaturePrivilegesCustomization,
  clickFlyoutAddKibanaPrivilegeButton,
  clickRoleSaveButton,
  clickViewPrivilegeSummaryButton,
  expandEndpointSecurityFeaturePrivileges,
  expandSecuritySolutionCategoryKibanaPrivileges,
  navigateToRolePage,
  openKibanaFeaturePrivilegesFlyout,
  setEndpointSubFeaturePrivilege,
  setKibanaPrivilegeSpace,
  setRoleName,
  setSecuritySolutionEndpointGroupPrivilege,
} from '../../screens/stack_management/role_page';

describe(
  'When defining a kibana role for Endpoint security access with space awareness enabled',
  {
    tags: ['@ess', '@serverless', '@serverlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
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
      closeAllToasts();
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
      closeAllToasts();
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
        .should('deep.equal', [
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
  }
);
