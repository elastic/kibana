/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_MIGRATION_RULES = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.searchAriaLabel',
  {
    defaultMessage: 'Search migration rules',
  }
);

export const SEARCH_MIGRATION_RULES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.searchBarPlaceholder',
  {
    defaultMessage: 'Search by migration rule name',
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

export const INSTALL_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.rules.table.installSelectedRules', {
    defaultMessage: 'Install selected ({numberOfSelectedRules})',
    values: { numberOfSelectedRules },
  });
};

export const INSTALL_ALL_RULES = (numberOfAllRules: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.rules.table.installAllRules', {
    defaultMessage:
      'Install translated {numberOfAllRules, plural, one {rule} other {rules}} ({numberOfAllRules})',
    values: { numberOfAllRules },
  });
};

export const INSTALL_SELECTED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installSelectedButtonAriaLabel',
  {
    defaultMessage: 'Install selected translated rules',
  }
);

export const INSTALL_ALL_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.installAllButtonAriaLabel',
  {
    defaultMessage: 'Install all translated rules',
  }
);
