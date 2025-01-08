/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivilegeType, ClusterPrivilegeType } from '../../../common/privilege_type';

export enum ApmUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
  apmMonitorClusterAndIndices = 'apm_monitor_cluster_and_indices',
  apmManageServiceAccount = 'apm_manage_service_account',
  apmAllPrivilegesWithoutWriteSettings = 'apm_all_privileges_without_write_settings',
  apmReadPrivilegesWithWriteSettings = 'apm_read_privileges_with_write_settings',
}

export enum ApmCustomRolename {
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
  apmMonitorClusterAndIndices = 'apm_monitor_cluster_and_indices',
  apmManageServiceAccount = 'apm_manage_service_account',
  apmAllPrivilegesWithoutWriteSettings = 'apm_all_privileges_without_write_settings',
  apmReadPrivilegesWithWriteSettings = 'apm_read_privileges_with_write_settings',
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
      cluster: [ClusterPrivilegeType.MANAGE_OWN_API_KEY],
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
  [ApmCustomRolename.apmMonitorClusterAndIndices]: {
    elasticsearch: {
      indices: [
        {
          names: ['traces-apm*', 'logs-apm*', 'metrics-apm*', 'apm-*'],
          privileges: ['monitor'],
        },
      ],
      cluster: ['monitor'],
    },
  },
  [ApmCustomRolename.apmManageServiceAccount]: {
    elasticsearch: {
      cluster: ['manage_service_account'],
    },
  },
  [ApmCustomRolename.apmAllPrivilegesWithoutWriteSettings]: {
    elasticsearch: {
      cluster: ['manage_api_key'],
    },
    kibana: [
      {
        base: [],
        feature: { apm: ['minimal_all'], ml: ['all'] },
        spaces: ['*'],
      },
    ],
  },
  [ApmCustomRolename.apmReadPrivilegesWithWriteSettings]: {
    elasticsearch: {
      cluster: ['manage_api_key'],
    },
    kibana: [
      {
        base: [],
        feature: {
          apm: ['minimal_read', 'settings_save'],
          advancedSettings: ['all'],
          ml: ['all'],
          savedObjectsManagement: ['all'],
        },
        spaces: ['*'],
      },
    ],
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
  [ApmUsername.apmMonitorClusterAndIndices]: {
    builtInRoleNames: ['viewer'],
    customRoleNames: [ApmCustomRolename.apmMonitorClusterAndIndices],
  },
  [ApmUsername.apmManageServiceAccount]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [ApmCustomRolename.apmManageServiceAccount],
  },
  [ApmUsername.apmAllPrivilegesWithoutWriteSettings]: {
    builtInRoleNames: ['viewer'],
    customRoleNames: [ApmCustomRolename.apmAllPrivilegesWithoutWriteSettings],
  },
  [ApmUsername.apmReadPrivilegesWithWriteSettings]: {
    builtInRoleNames: ['viewer'],
    customRoleNames: [ApmCustomRolename.apmReadPrivilegesWithWriteSettings],
  },
};
