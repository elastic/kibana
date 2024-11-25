/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.searchBarPlaceholder',
  {
    defaultMessage: 'Search by rule name',
  }
);

export const NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.noRulesTitle',
  {
    defaultMessage: 'Empty migration',
  }
);

export const NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL_BODY = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.noRulesBodyTitle',
  {
    defaultMessage: 'There are no translations available for installation',
  }
);

export const GO_BACK_TO_RULES_TABLE_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.goToMigrationsPageButton',
  {
    defaultMessage: 'Go back to SIEM Migrations',
  }
);
