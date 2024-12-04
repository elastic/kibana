/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_MIGRATION_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.getMigrationRulesFailDescription',
  {
    defaultMessage: 'Failed to fetch migration rules',
  }
);

export const GET_MIGRATION_TRANSLATION_STATS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.getMigrationTranslationStatsFailDescription',
  {
    defaultMessage: 'Failed to fetch migration translation stats',
  }
);

export const INSTALL_MIGRATION_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.installMigrationRulesFailDescription',
  {
    defaultMessage: 'Failed to install migration rules',
  }
);
