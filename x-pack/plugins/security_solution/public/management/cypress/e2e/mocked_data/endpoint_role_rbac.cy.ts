/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';

describe('When defining a kibana role for Endpoint security access', () => {
  const privilegesChecks: ReadonlyArray<{
    label: string;
    testSubj: string[];
  }> = [
    {
      label: 'Endpoint List',
      testSubj: ['endpoint_list_all', 'endpoint_list_read'],
    },
    {
      label: 'Trusted Applications',
      testSubj: ['trusted_applications_all', 'trusted_applications_read'],
    },
    {
      label: 'Host Isolation Exceptions',
      testSubj: ['host_isolation_exceptions_all', 'host_isolation_exceptions_read'],
    },
    {
      label: 'Blocklist',
      testSubj: ['blocklist_all', 'blocklist_read'],
    },
    {
      label: 'Event Filters',
      testSubj: ['event_filters_all', 'event_filters_read'],
    },
    {
      label: 'Policy Management',
      testSubj: ['policy_management_all', 'policy_management_read'],
    },
    {
      label: 'Response Actions History',
      testSubj: ['actions_log_management_all', 'actions_log_management_read'],
    },
    {
      label: 'Host Isolation',
      testSubj: ['host_isolation_all'],
    },
    {
      label: 'Process Operations',
      testSubj: ['process_operations_all'],
    },
    {
      label: 'File Operations',
      testSubj: ['file_operations_all'],
    },
    {
      label: 'Execute Operations',
      testSubj: ['execute_operations_all'],
    },
  ];

  beforeEach(() => {
    login();
    cy.visit('/app/management/security/roles/edit');
    cy.getByTestSubj('addSpacePrivilegeButton').click();
    cy.get('button[aria-controls="featureCategory_securitySolution"]');
    cy.get('button[aria-controls="featurePrivilegeControls_siem"]');
  });

  it.todo('should displays the expected number of RBAC entries');

  it.todo('should display all RBAC entries set to None by default');

  for (const privilegesCheck of privilegesChecks) {
    //
  }
});
