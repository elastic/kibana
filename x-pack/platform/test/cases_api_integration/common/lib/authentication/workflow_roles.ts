/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Roles and users scoped to the workflow execution tests.
 *
 * These are intentionally NOT added to the global `roles`/`users` arrays in
 * `authentication/roles.ts` / `authentication/users.ts` because those arrays
 * are also consumed by the `basic` license config and `workflowsManagement`
 * sub-feature privileges (e.g. `workflow_execute`) only exist under a trial
 * or higher license. Creating them under basic would fail.
 *
 * Create and delete these via `createUsersAndRoles` / `deleteUsersAndRoles`
 * from the trial-only test's own `before`/`after`.
 */

import type { Role, User } from './types';

const defaultElasticsearchPrivileges = {
  elasticsearch: {
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
};

/** Security fixture owner + workflow execute — the primary "authorized" user in these tests. */
export const secAllWorkflowExecuteRole: Role = {
  name: 'sec_all_workflow_execute_ftr',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          workflowsManagement: ['minimal_all', 'workflow_execute'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

/** Security fixture owner without workflow execute — catches missing route-level privilege. */
export const secAllNoWorkflowExecuteRole: Role = {
  name: 'sec_all_no_workflow_execute_ftr',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

/** Workflow execute only (no cases) — catches missing handler-level cases privilege. */
export const workflowExecuteOnlyRole: Role = {
  name: 'workflow_execute_only_ftr',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          workflowsManagement: ['minimal_all', 'workflow_execute'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

/** Observability fixture owner + workflow execute — used for cross-owner 403 tests. */
export const obsAllWorkflowExecuteRole: Role = {
  name: 'obs_all_workflow_execute_ftr',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          observabilityFixture: ['all'],
          workflowsManagement: ['minimal_all', 'workflow_execute'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

/**
 * Security fixture owner + workflow execute in ALL spaces — used to verify that a
 * workflow created in space1 is not visible when the request is made from the default space.
 */
export const secAllWorkflowExecuteAllSpacesRole: Role = {
  name: 'sec_all_workflow_execute_all_spaces_ftr',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          workflowsManagement: ['minimal_all', 'workflow_execute'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const workflowRoles: Role[] = [
  secAllWorkflowExecuteRole,
  secAllNoWorkflowExecuteRole,
  workflowExecuteOnlyRole,
  obsAllWorkflowExecuteRole,
  secAllWorkflowExecuteAllSpacesRole,
];

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const secAllWorkflowExecuteUser: User = {
  username: 'sec_all_workflow_execute_ftr',
  password: 'sec_all_workflow_execute_ftr',
  roles: [secAllWorkflowExecuteRole.name],
};

export const secAllNoWorkflowExecuteUser: User = {
  username: 'sec_all_no_workflow_execute_ftr',
  password: 'sec_all_no_workflow_execute_ftr',
  roles: [secAllNoWorkflowExecuteRole.name],
};

export const workflowExecuteOnlyUser: User = {
  username: 'workflow_execute_only_ftr',
  password: 'workflow_execute_only_ftr',
  roles: [workflowExecuteOnlyRole.name],
};

export const obsAllWorkflowExecuteUser: User = {
  username: 'obs_all_workflow_execute_ftr',
  password: 'obs_all_workflow_execute_ftr',
  roles: [obsAllWorkflowExecuteRole.name],
};

export const secAllWorkflowExecuteAllSpacesUser: User = {
  username: 'sec_all_workflow_execute_all_spaces_ftr',
  password: 'sec_all_workflow_execute_all_spaces_ftr',
  roles: [secAllWorkflowExecuteAllSpacesRole.name],
};

export const workflowUsers: User[] = [
  secAllWorkflowExecuteUser,
  secAllNoWorkflowExecuteUser,
  workflowExecuteOnlyUser,
  obsAllWorkflowExecuteUser,
  secAllWorkflowExecuteAllSpacesUser,
];
