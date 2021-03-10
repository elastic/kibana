/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ROLE_MAPPINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.roleMappings.title',
  { defaultMessage: 'Role Mappings' }
);

export const DELETE_ROLE_MAPPINGS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.deleteRoleMappingMessage',
  {
    defaultMessage:
      'Are you sure you want to permanently delete this mapping? This action is not reversible and some users might lose access.',
  }
);
