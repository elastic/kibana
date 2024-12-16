/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_MIGRATION_READY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.ready.description',
  {
    defaultMessage:
      'Migration is created and ready but the translation has not started yet. You can either upload macros & lookups or start the translation process',
  }
);
export const RULE_MIGRATION_START_TRANSLATION_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translate.button',
  { defaultMessage: 'Start translation' }
);
export const RULE_MIGRATION_UPLOAD_MACROS_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.uploadMacros.button',
  { defaultMessage: 'Upload macros' }
);

export const RULE_MIGRATION_TITLE = (number: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.migrationTitle', {
    defaultMessage: 'SIEM rules migration #{number}',
    values: { number },
  });

export const RULE_MIGRATION_PROGRESS_DESCRIPTION = (totalRules: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.progress.description', {
    defaultMessage: `Processing migration of {totalRules} rules.`,
    values: { totalRules },
  });
export const RULE_MIGRATION_PREPARING = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.preparing',
  { defaultMessage: `Preparing environment for the AI powered translation.` }
);
export const RULE_MIGRATION_TRANSLATING = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.translating',
  { defaultMessage: `Translating rules` }
);

export const RULE_MIGRATION_COMPLETE_TITLE = (number: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.result.title', {
    defaultMessage: 'SIEM rules migration #{number} complete',
    values: { number },
  });

export const RULE_MIGRATION_COMPLETE_DESCRIPTION = (createdAt: string, finishedAt: string) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.panel.result.description', {
    defaultMessage: 'Export uploaded on {createdAt} and translation finished {finishedAt}.',
    values: { createdAt, finishedAt },
  });

export const RULE_MIGRATION_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.title',
  { defaultMessage: 'Translation Summary' }
);

export const RULE_MIGRATION_VIEW_TRANSLATED_RULES_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.button',
  { defaultMessage: 'View translated rules' }
);

export const RULE_MIGRATION_TRANSLATION_FAILED = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.failed',
  { defaultMessage: 'Failed' }
);

export const RULE_MIGRATION_TABLE_COLUMN_RESULT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.tableColumn.result',
  { defaultMessage: 'Result' }
);
export const RULE_MIGRATION_TABLE_COLUMN_RULES = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.panel.result.summary.tableColumn.rules',
  { defaultMessage: 'Rules' }
);
