/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { AdvanceRoleType } from '../../types';

export const SAVE_ROLE_MAPPING = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMapping.saveRoleMappingButtonLabel',
  { defaultMessage: 'Save role mapping' }
);
export const UPDATE_ROLE_MAPPING = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMapping.updateRoleMappingButtonLabel',
  { defaultMessage: 'Update role mapping' }
);

export const EMPTY_ROLE_MAPPINGS_BODY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMapping.emptyRoleMappingsBody',
  {
    defaultMessage:
      'All users who successfully authenticate will be assigned the Owner role and have access to all engines. Add a new role to override the default.',
  }
);

export const DELETE_ROLE_MAPPING_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.deleteRoleMappingMessage',
  {
    defaultMessage:
      'Are you sure you want to permanently delete this mapping? This action is not reversible and some users might lose access.',
  }
);

export const ROLE_MAPPING_DELETED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingDeletedMessage',
  {
    defaultMessage: 'Successfully deleted role mapping',
  }
);

export const ROLE_MAPPING_CREATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingCreatedMessage',
  {
    defaultMessage: 'Role mapping successfully created.',
  }
);

export const ROLE_MAPPING_UPDATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingUpdatedMessage',
  {
    defaultMessage: 'Role mapping successfully updated.',
  }
);

export const ROLE_MAPPINGS_ENGINE_ACCESS_HEADING = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingsEngineAccessHeading',
  {
    defaultMessage: 'Engine access',
  }
);

export const ROLE_MAPPINGS_RESET_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingsResetButton',
  {
    defaultMessage: 'Reset mappings',
  }
);

export const ROLE_MAPPINGS_RESET_CONFIRM_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingsResetConfirmTitle',
  {
    defaultMessage: 'Are you sure you want to reset role mappings?',
  }
);

export const ROLE_MAPPINGS_RESET_CONFIRM_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingsResetConfirmButton',
  {
    defaultMessage: 'Reset role mappings',
  }
);

export const ROLE_MAPPINGS_RESET_CANCEL_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappingsResetCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const DEV_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.DEV_ROLE_TYPE_DESCRIPTION',
  {
    defaultMessage: 'Devs can manage all aspects of an engine.',
  }
);

export const EDITOR_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.editorRoleTypeDescription',
  {
    defaultMessage: 'Editors can manage search settings.',
  }
);

export const ANALYST_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.analystRoleTypeDescription',
  {
    defaultMessage: 'Analysts can only view documents, query tester, and analytics.',
  }
);

export const OWNER_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.ownerRoleTypeDescription',
  {
    defaultMessage:
      'Owners can do anything. There can be many owners on the account, but there must be at least one owner at any time.',
  }
);

export const ADMIN_ROLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.adminRoleTypeDescription',
  {
    defaultMessage: 'Admins can do anything, except manage account settings.',
  }
);

export const ADVANCED_ROLE_SELECTORS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.advancedRoleSelectorsTitle',
  {
    defaultMessage: 'Full or limited engine access',
  }
);

export const ROLE_TITLE = i18n.translate('xpack.enterpriseSearch.appSearch.roleTitle', {
  defaultMessage: 'Role',
});

export const FULL_ENGINE_ACCESS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.fullEngineAccessTitle',
  {
    defaultMessage: 'Full engine access',
  }
);

export const FULL_ENGINE_ACCESS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.fullEngineAccessDescription',
  {
    defaultMessage: 'Access to all current and future engines.',
  }
);

export const LIMITED_ENGINE_ACCESS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.limitedEngineAccessTitle',
  {
    defaultMessage: 'Limited engine access',
  }
);

export const LIMITED_ENGINE_ACCESS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.limitedEngineAccessDescription',
  {
    defaultMessage: 'Limit user access to specific engines:',
  }
);

export const ENGINE_ACCESS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engineAccessTitle',
  {
    defaultMessage: 'Engine access',
  }
);

export const ADVANCED_ROLE_TYPES = [
  {
    type: 'dev',
    description: DEV_ROLE_TYPE_DESCRIPTION,
  },
  {
    type: 'editor',
    description: EDITOR_ROLE_TYPE_DESCRIPTION,
  },
  {
    type: 'analyst',
    description: ANALYST_ROLE_TYPE_DESCRIPTION,
  },
] as AdvanceRoleType[];

export const STANDARD_ROLE_TYPES = [
  {
    type: 'owner',
    description: OWNER_ROLE_TYPE_DESCRIPTION,
  },
  {
    type: 'admin',
    description: ADMIN_ROLE_TYPE_DESCRIPTION,
  },
] as AdvanceRoleType[];
