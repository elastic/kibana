/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.searchBarPlaceholder',
  {
    defaultMessage: 'Search by rule name',
  }
);

export const SIEM_TRANSLATION_RESULT_FULL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.translationResult.full',
  {
    defaultMessage: 'Fully translated',
  }
);

export const SIEM_TRANSLATION_RESULT_PARTIAL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.translationResult.partially',
  {
    defaultMessage: 'Partially translated',
  }
);

export const SIEM_TRANSLATION_RESULT_UNTRANSLATABLE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.translationResult.untranslatable',
  {
    defaultMessage: 'Not translated',
  }
);

export const SIEM_TRANSLATION_RESULT_UNKNOWN_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.translationResult.unknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.noRulesTitle',
  {
    defaultMessage: 'Empty migration',
  }
);

export const NO_TRANSLATIONS_AVAILABLE_FOR_INSTALL_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.noRulesBodyTitle',
  {
    defaultMessage: 'There are no translations available for installation',
  }
);

export const GO_BACK_TO_RULES_TABLE_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.goToMigrationsPageButton',
  {
    defaultMessage: 'Go back to SIEM Migrations',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.columns.statusTitle',
  {
    defaultMessage: 'Status',
  }
);

export const SIEM_MIGRATIONS_OPTION_AREAL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.siemMigrations.selectionOption.arealLabel',
  {
    defaultMessage: 'Select a migration',
  }
);

export const SIEM_MIGRATIONS_OPTION_LABEL = (optionIndex: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.siemMigrations.selectionOption.title',
    {
      defaultMessage: 'SIEM rule migration {optionIndex}',
      values: {
        optionIndex,
      },
    }
  );
