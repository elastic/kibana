/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_MIGRATION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.title',
  { defaultMessage: 'Translate your existing SIEM Rules to Elastic' }
);

export const START_MIGRATION_CARD_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.title',
  { defaultMessage: 'Export your Splunk® SIEM rules to start translation.' }
);

export const START_MIGRATION_CARD_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.description',
  {
    defaultMessage:
      'Upload your rules before importing data to identify the integrations, data streams, and available details of your SIEM rules. Click “Upload Rules” to view step-by-step instructions to export and uploading the rules.',
  }
);

export const START_MIGRATION_CARD_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.button',
  { defaultMessage: 'Upload rules' }
);

export const START_MIGRATION_CARD_UPLOAD_MORE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMore.title',
  { defaultMessage: 'Need to migrate more rules?' }
);
export const START_MIGRATION_CARD_UPLOAD_MORE_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMore.button',
  { defaultMessage: 'Upload more rules' }
);

export const START_MIGRATION_CARD_UPLOAD_READ_MORE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.readMore',
  { defaultMessage: 'Read more about our AI powered translations and other features.' }
);

export const START_MIGRATION_CARD_UPLOAD_READ_DOCS = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.readAiDocsLink',
  { defaultMessage: 'Read AI docs' }
);

export const START_MIGRATION_CARD_MIGRATION_READY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.ready.description',
  {
    defaultMessage:
      'Migration is created and ready but the translation has not started yet. You can either upload macros & lookups or start the translation process',
  }
);
export const START_MIGRATION_CARD_TRANSLATE_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.translate.button',
  { defaultMessage: 'Start translation' }
);
export const START_MIGRATION_CARD_UPLOAD_MACROS_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMacros.button',
  { defaultMessage: 'Upload macros' }
);

export const START_MIGRATION_CARD_MIGRATION_TITLE = (number: number) =>
  i18n.translate('xpack.securitySolution.onboarding.startMigration.migrationTitle', {
    defaultMessage: 'SIEM rules migration #{number}',
    values: { number },
  });

export const START_MIGRATION_CARD_PROGRESS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.progress.description',
  {
    defaultMessage: `This may take a few minutes & the task will work in the background. Just stay logged in and we'll notify you when done.`,
  }
);

export const START_MIGRATION_CARD_RESULT_TITLE = (number: number) =>
  i18n.translate('xpack.securitySolution.onboarding.startMigration.result.title', {
    defaultMessage: 'SIEM rules migration #{number} complete',
    values: { number },
  });

export const START_MIGRATION_CARD_RESULT_DESCRIPTION = (values: {
  createdAt: string;
  finishedAt: string;
}) =>
  i18n.translate('xpack.securitySolution.onboarding.startMigration.result.description', {
    defaultMessage: 'Export uploaded on {createdAt} and translation finished {finishedAt}.',
    values,
  });

export const VIEW_TRANSLATED_RULES_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.result.translatedRules.title',
  { defaultMessage: 'Translation Summary' }
);

export const VIEW_TRANSLATED_RULES_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.result.translatedRules.button',
  { defaultMessage: 'View translated rules' }
);
