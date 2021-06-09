/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DELETE_ROLE_MAPPING_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.deleteRoleMappingButtonMessage',
  {
    defaultMessage:
      'Are you sure you want to permanently delete this mapping? This action is not reversible and some users might lose access.',
  }
);

export const ROLE_MAPPING_DELETED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMappingDeletedMessage',
  {
    defaultMessage: 'Successfully deleted role mapping',
  }
);

export const ROLE_MAPPING_CREATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMappingCreatedMessage',
  {
    defaultMessage: 'Role mapping successfully created.',
  }
);

export const ROLE_MAPPING_UPDATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMappingUpdatedMessage',
  {
    defaultMessage: 'Role mapping successfully updated.',
  }
);

export const DEFAULT_GROUP_NAME = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.defaultGroupName',
  {
    defaultMessage: 'Default',
  }
);

export const ADMIN_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.adminRoleTypeDescription',
  {
    defaultMessage:
      'Admins have complete access to all organization-wide settings, including content source, group and user management functionality.',
  }
);

export const USER_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.userRoleTypeDescription',
  {
    defaultMessage:
      "Users' feature access is limited to search interfaces and personal settings management.",
  }
);

export const GROUP_ASSIGNMENT_INVALID_ERROR = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.groupAssignmentInvalidError',
  {
    defaultMessage: 'At least one assigned group is required.',
  }
);

export const GROUP_ASSIGNMENT_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.groupAssignmentLabel',
  {
    defaultMessage: 'Group assignment',
  }
);

export const ROLE_MAPPINGS_TABLE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.roleMappingsTableHeader',
  {
    defaultMessage: 'Group Access',
  }
);

export const ALL_GROUPS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.allGroupsLabel',
  {
    defaultMessage: 'Assign to all groups',
  }
);

export const ALL_GROUPS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.allGroupsDescription',
  {
    defaultMessage:
      'Assigning to all groups includes all current and future groups as created and administered at a later date.',
  }
);

export const SPECIFIC_GROUPS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.specificGroupsLabel',
  {
    defaultMessage: 'Assign to specific groups',
  }
);

export const SPECIFIC_GROUPS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.roleMapping.specificGroupsDescription',
  {
    defaultMessage: 'Assign to a select set of groups statically.',
  }
);
