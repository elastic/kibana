/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivilegeType } from '../../../common/privilege_type';

export enum ApmUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
  apmMonitorIndices = 'apm_monitor_indices',
}

export enum ApmCustomRolename {
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
  apmMonitorIndices = 'apm_monitor_indices',
}

export const customRoles = {
  [ApmCustomRolename.apmReadUserWithoutMlAccess]: {
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: ['apm-*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        feature: { apm: ['read'] },
        spaces: ['*'],
      },
    ],
  },
  [ApmCustomRolename.apmAnnotationsWriteUser]: {
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: ['observability-annotations'],
          privileges: [
            'read',
            'view_index_metadata',
            'index',
            'manage',
            'create_index',
            'create_doc',
          ],
        },
      ],
    },
  },
  [ApmCustomRolename.apmManageOwnAgentKeys]: {
    elasticsearch: {
      cluster: ['manage_own_api_key'],
    },
  },
  [ApmCustomRolename.apmManageOwnAndCreateAgentKeys]: {
    applications: [
      {
        application: 'apm',
        privileges: [PrivilegeType.AGENT_CONFIG, PrivilegeType.EVENT],
        resources: ['*'],
      },
    ],
  },
  [ApmCustomRolename.apmMonitorIndices]: {
    elasticsearch: {
      indices: [
        {
          names: ['traces-apm*', 'logs-apm*', 'metrics-apm*', 'apm-*'],
          privileges: ['monitor'],
        },
      ],
    },
  },
};

export const users: Record<
  ApmUsername,
  { builtInRoleNames?: string[]; customRoleNames?: ApmCustomRolename[] }
> = {
  [ApmUsername.noAccessUser]: {},
  [ApmUsername.viewerUser]: {
    builtInRoleNames: ['viewer'],
  },
  [ApmUsername.editorUser]: {
    builtInRoleNames: ['editor'],
  },
  [ApmUsername.apmReadUserWithoutMlAccess]: {
    customRoleNames: [ApmCustomRolename.apmReadUserWithoutMlAccess],
  },
  [ApmUsername.apmAnnotationsWriteUser]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [ApmCustomRolename.apmAnnotationsWriteUser],
  },
  [ApmUsername.apmManageOwnAgentKeys]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [ApmCustomRolename.apmManageOwnAgentKeys],
  },
  [ApmUsername.apmManageOwnAndCreateAgentKeys]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [
      ApmCustomRolename.apmManageOwnAgentKeys,
      ApmCustomRolename.apmManageOwnAndCreateAgentKeys,
    ],
  },
  [ApmUsername.apmMonitorIndices]: {
    builtInRoleNames: ['viewer'],
    customRoleNames: [ApmCustomRolename.apmMonitorIndices],
  },
};

export const APM_TEST_PASSWORD = 'changeme';
