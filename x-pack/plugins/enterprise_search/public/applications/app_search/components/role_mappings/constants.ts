/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_ROLE_MAPPINGS_BODY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMapping.emptyRoleMappingsBody',
  {
    defaultMessage:
      'All users who successfully authenticate will be assigned the Owner role and have access to all engines. Add a new role to override the default.',
  }
);

export const DELETE_ROLE_MAPPINGS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.deleteRoleMappingMessage',
  {
    defaultMessage:
      'Are you sure you want to permanently delete this mapping? This action is not reversible and some users might lose access.',
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
